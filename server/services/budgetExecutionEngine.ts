/**
 * Server-side Budget Execution Engine
 * 
 * Ports `calculateBudgetExecution()` from `src/utils/budgetExecution.ts` to the server.
 * Uses the cached SAP uploads instead of fetching them from the browser.
 */
import { getDbConnection } from '../db.js';
import sql from 'mssql';

// ─── Types ──────────────────────────────────────────────────────────

export interface TransactionDetail {
    doc_number: string;
    description: string;
    date: string;
    amount: number;
    currency: string;
    reference?: string;
    status?: string;
    vendor?: string;
    related_oc?: string;
    related_solped?: string;
}

export interface BudgetExecutionRow {
    account_id: string;
    account_name: string;
    account_code: string;
    cost_center_id?: string;
    budgeted: number;
    committed: number;
    ordered: number;
    real: number;
    available: number;
    execution_pct: number;
    monthly_budget: number[];
    monthly_real: number[];
    details: {
        committed: TransactionDetail[];
        ordered: TransactionDetail[];
        real: TransactionDetail[];
    };
}

export interface BudgetExecutionSummary {
    total_budget: number;
    total_committed: number;
    total_ordered: number;
    total_real: number;
    total_available: number;
    execution_pct: number;
    rows: BudgetExecutionRow[];
}

interface ExchangeRate {
    year: number;
    rates: number[]; // 12 months, 0-indexed
}

// ─── Helpers ────────────────────────────────────────────────────────

function normalize(val: unknown): string {
    return String(val || '').trim().toUpperCase();
}

function formatDate(val: unknown): string {
    if (!val) return '';
    const num = Number(val);
    if (!isNaN(num) && num > 40000 && num < 60000) {
        const date = new Date((num - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    return String(val);
}

// ─── Main Engine ────────────────────────────────────────────────────

export async function calculateBudgetExecutionServer(
    year: number,
    managementId: string,
    costCenterId: string | 'all',
    exchangeRates: ExchangeRate[],
    sapUploads: { transaction_type: string; data: Record<string, unknown>[] }[]
): Promise<BudgetExecutionSummary> {
    const pool = await getDbConnection();

    // 1. Get budgets for this year/management
    const budgetQuery = `
        SELECT 
            b.Id as id,
            b.Year as year,
            b.AccountId as account_id,
            b.ManagementId as management_id,
            b.CostCenterId as cost_center_id,
            b.Total as total
        FROM EBM.Budgets b
        WHERE b.Year = @year AND b.ManagementId = @managementId
    `;
    const budgetRequest = pool.request()
        .input('year', sql.Int, year)
        .input('managementId', sql.NVarChar(50), managementId);
    const budgetResult = await budgetRequest.query(budgetQuery);
    const budgets = budgetResult.recordset;

    // Get budget months
    if (budgets.length > 0) {
        const budgetIds = budgets.map((b: { id: string; [key: string]: unknown }) => b.id);
        const placeholders = budgetIds.map((_, i: number) => `@p${i}`).join(',');
        const monthsRequest = pool.request();
        budgetIds.forEach((id: string, i: number) => monthsRequest.input(`p${i}`, id));
        const monthsResult = await monthsRequest.query(`
            SELECT BudgetId, MonthIndex, Amount
            FROM EBM.BudgetMonths
            WHERE BudgetId IN (${placeholders})
            ORDER BY MonthIndex ASC
        `);
        const monthsMap: Record<string, number[]> = {};
        monthsResult.recordset.forEach((row: { BudgetId: string; MonthIndex: number; Amount: number }) => {
            if (!monthsMap[row.BudgetId]) monthsMap[row.BudgetId] = Array(12).fill(0);
            monthsMap[row.BudgetId][row.MonthIndex] = row.Amount;
        });
        budgets.forEach((b: { id: string; monthly_amounts?: number[]; [key: string]: unknown }) => {
            b.monthly_amounts = monthsMap[b.id] || Array(12).fill(0);
        });
    }

    // 2. Get accounts
    const accountsResult = await pool.request().query(`
        SELECT Id as id, Code as code, Name as name, IsActive as is_active
        FROM EBM.AccountingAccounts
    `);
    const accounts = accountsResult.recordset;

    // 3. Get cost centers
    const cecosResult = await pool.request().query(`
        SELECT Id as id, Code as code, Name as name, ManagementId as management_id, IsActive as is_active
        FROM EBM.CostCenters
    `);
    const allCecos = cecosResult.recordset;

    // 4. Currency conversion helper
    const DEFAULT_RATE = 3.80;
    const getRateForMonthYear = (month: number, rateYear: number): number => {
        const yearRates = exchangeRates.find(r => r.year === rateYear);
        return yearRates?.rates[month] || DEFAULT_RATE;
    };

    const convertToPen = (amount: number, currency: string | undefined, excelDate: string | number | undefined): number => {
        if (!amount || isNaN(amount)) return 0;
        const curr = String(currency || '').toUpperCase();
        if (curr !== 'USD') return amount;
        let month = 0;
        let defaultYear = year;
        const numDate = Number(excelDate);
        if (!isNaN(numDate) && numDate > 40000 && numDate < 60000) {
            const date = new Date((numDate - 25569) * 86400 * 1000);
            month = date.getMonth();
            defaultYear = date.getFullYear();
        }
        const rate = getRateForMonthYear(month, defaultYear);
        return amount * rate;
    };

    // 5. Filter CeCos
    const relevantCecoCodes = new Set<string>();
    if (costCenterId && costCenterId !== 'all') {
        const ceco = allCecos.find((c: { id: string; management_id: string; is_active: boolean; code: string }) => c.id === costCenterId);
        if (ceco) relevantCecoCodes.add(normalize(ceco.code));
    } else {
        allCecos.filter((c: { id: string; management_id: string; is_active: boolean; code: string }) => c.management_id === managementId && c.is_active)
            .forEach((c: { id: string; management_id: string; is_active: boolean; code: string }) => relevantCecoCodes.add(normalize(c.code)));
    }

    // 6. Extract SAP data
    const solpedUpload = sapUploads.find(u => u.transaction_type === 'ME5K') || sapUploads.find(u => u.transaction_type === 'ME5A');
    const solpedRows = solpedUpload?.data || [];
    const me5aUpload = sapUploads.find(u => u.transaction_type === 'ME5A');
    const me5aRows = me5aUpload?.data || [];
    const me5aMap = new Map<string, Record<string, unknown>>();
    me5aRows.forEach(row => {
        const pr = normalize(row.pr_number);
        if (pr) me5aMap.set(pr, row);
    });
    const ocUpload = sapUploads.find(u => u.transaction_type === 'ME2K');
    const ocRows = ocUpload?.data || [];
    const realUpload = sapUploads.find(u => u.transaction_type === 'KSB1') || sapUploads.find(u => u.transaction_type === 'FBL1N');
    const realRows = realUpload?.data || [];

    // PO Master Map
    const poMasterMap = new Map<string, { vendor: string; solped: string; ceco: string }>();
    ocRows.forEach(row => {
        const poNum = normalize(row.po_number);
        if (!poNum) return;
        const vendorName = String(row.vendor_name || row.vendor_id || '').trim();
        const solpedNum = normalize(row.pr_number);
        const ceco = normalize(row.cost_center);
        if (!poMasterMap.has(poNum)) {
            poMasterMap.set(poNum, { vendor: vendorName, solped: solpedNum, ceco });
        }
    });

    // 7. Aggregation Map
    const aggregation = new Map<string, {
        budgeted: number;
        committed: number;
        committed_effective: number;
        ordered: number;
        real: number;
        monthly_budget: number[];
        monthly_real: number[];
        details: { committed: TransactionDetail[]; ordered: TransactionDetail[]; real: TransactionDetail[] };
    }>();

    const findAccount = (rawCode: string) => {
        const target = normalize(rawCode);
        return accounts.find((a: { id: string; code: string; name: string }) => {
            const accCode = normalize(a.code);
            return target === accCode || target.endsWith(accCode);
        });
    };

    const getEntry = (code: string) => {
        const normCode = normalize(code);
        if (!aggregation.has(normCode)) {
            aggregation.set(normCode, {
                budgeted: 0,
                committed: 0,
                committed_effective: 0,
                ordered: 0,
                real: 0,
                monthly_budget: Array(12).fill(0),
                monthly_real: Array(12).fill(0),
                details: { committed: [], ordered: [], real: [] }
            });
        }
        return aggregation.get(normCode)!;
    };

    // 8. Process Budgets
    budgets.forEach((b: { id: string; cost_center_id?: string; account_id: string; total: number; monthly_amounts?: number[]; [key: string]: unknown }) => {
        if (costCenterId && costCenterId !== 'all' && b.cost_center_id !== costCenterId) return;
        const account = accounts.find((a: { id: string; code: string; name: string }) => a.id === b.account_id);
        if (!account) return;
        const entry = getEntry(account.code);
        entry.budgeted += b.total;
        (b.monthly_amounts || []).forEach((amt: number, idx: number) => { entry.monthly_budget[idx] += amt; });
    });

    // 9. Process Solpeds (Committed)
    solpedRows.forEach(row => {
        const ceco = normalize(row.cost_center);
        if (!relevantCecoCodes.has(ceco)) return;
        const accountCode = String(row.gl_account || row.cost_element || '').trim();
        const account = findAccount(accountCode);
        if (account) {
            const entry = getEntry(account.code);
            let val = Number(row.net_value || row.amount || row.total_value || 0);
            if (val === 0) {
                const prNum = normalize(row.pr_number);
                if (prNum && me5aMap.has(prNum)) {
                    const me5aRow = me5aMap.get(prNum);
                    val = Number(me5aRow.total_value) || (Number(me5aRow.quantity || 0) * Number(me5aRow.unit_price || 0));
                }
            }
            if (!isNaN(val) && val !== 0) {
                const currency = String(row.currency || 'PEN').toUpperCase();
                const dateRaw = row.release_date || row.request_date;
                const finalVal = convertToPen(val, currency, dateRaw);
                entry.committed += finalVal;
                const hasPO = row.po_number && String(row.po_number).trim() !== '';
                if (!hasPO) entry.committed_effective += finalVal;
                const vendor = String(row.vendor_name || row.fixed_vendor || row.vendor_id || '').trim();
                entry.details.committed.push({
                    doc_number: String(row.pr_number || ''),
                    description: String(row.description || 'Sin descripción'),
                    date: formatDate(row.request_date),
                    amount: val, currency: 'PEN', status: 'solicitado',
                    vendor: vendor || undefined
                });
            }
        }
    });

    // 10. Process OCs (Ordered)
    ocRows.forEach(row => {
        const ceco = normalize(row.cost_center);
        if (!relevantCecoCodes.has(ceco)) return;
        const accountCode = String(row.gl_account || '').trim();
        const account = findAccount(accountCode);
        if (account) {
            const entry = getEntry(account.code);
            let val = Number(row.order_value || row.net_value || 0);
            if (val === 0) {
                const qty = Number(row.ordered_quantity || row.quantity || 0);
                const price = Number(row.net_price || 0);
                if (qty > 0 && price > 0) val = qty * price;
            }
            if (!isNaN(val) && val !== 0) {
                const currency = String(row.currency || 'PEN').toUpperCase();
                const finalVal = convertToPen(val, currency, row.document_date);
                entry.ordered += finalVal;
                const poNum = normalize(row.po_number);
                const master = poMasterMap.get(poNum);
                entry.details.ordered.push({
                    doc_number: String(row.po_number || ''),
                    description: String(row.description || 'Sin descripción'),
                    date: formatDate(row.document_date),
                    amount: val, currency: 'PEN',
                    reference: String(row.vendor_id || ''), status: 'pedido',
                    vendor: master?.vendor || String(row.vendor_id || ''),
                    related_solped: master?.solped || String(row.pr_number || '')
                });
            }
        }
    });

    // 11. Process Real (Executed)
    realRows.forEach(row => {
        let ceco = normalize(row.cost_center);
        if (!ceco) {
            const poRef = normalize(row.po_number || row.reference_doc);
            if (poRef && poMasterMap.has(poRef)) {
                ceco = poMasterMap.get(poRef)!.ceco;
            }
        }
        if (!relevantCecoCodes.has(ceco)) return;
        const accountCode = String(row.cost_element || row.gl_account || '').trim();
        const account = findAccount(accountCode);
        if (account) {
            const entry = getEntry(account.code);
            const val = Number(row.amount || row.amount_local || 0);
            if (!isNaN(val) && val !== 0) {
                const currency = String(row.currency_transaction || row.currency || 'PEN').toUpperCase();
                const finalVal = convertToPen(val, currency, row.posting_date);
                entry.real += finalVal;
                const poRef = normalize(row.po_number || row.reference_doc);
                const master = poMasterMap.get(poRef);
                const rowVendor = String(row.vendor_name || row.vendor_id || '').trim();
                entry.details.real.push({
                    doc_number: String(row.document_number || row.reference_doc || ''),
                    description: String(row.description || row.header_text || 'Sin descripción'),
                    date: formatDate(row.posting_date),
                    amount: val, currency: 'PEN',
                    reference: String(row.vendor_id || ''), status: 'real',
                    vendor: rowVendor || master?.vendor || undefined,
                    related_oc: poRef || undefined,
                    related_solped: master?.solped || undefined
                });
                const dateVal = row.posting_date;
                if (dateVal) {
                    const num = Number(dateVal);
                    if (!isNaN(num) && num > 40000 && num < 60000) {
                        const date = new Date((num - 25569) * 86400 * 1000);
                        const m = date.getMonth();
                        if (m >= 0 && m < 12) entry.monthly_real[m] += finalVal;
                    }
                }
            }
        }
    });

    // 12. Build result
    const rows: BudgetExecutionRow[] = [];
    let tot_budget = 0, tot_committed = 0, tot_ordered = 0, tot_real = 0, tot_available = 0;

    aggregation.forEach((val, code) => {
        const account = accounts.find((a: { id: string; code: string; name: string }) => normalize(a.code) === code);
        const name = account ? account.name : `Unknown (${code})`;
        const id = account ? account.id : code;
        const displayCode = account ? account.code : code;
        const total_expenses_effective = val.real + val.ordered + val.committed_effective;
        const available = val.budgeted - total_expenses_effective;
        const pct = val.budgeted > 0 ? (total_expenses_effective / val.budgeted) * 100 : 0;

        rows.push({
            account_id: id, account_code: displayCode, account_name: name,
            budgeted: val.budgeted, committed: val.committed, ordered: val.ordered, real: val.real,
            available, execution_pct: pct,
            monthly_budget: val.monthly_budget, monthly_real: val.monthly_real,
            details: val.details
        });

        tot_budget += val.budgeted;
        tot_committed += val.committed;
        tot_ordered += val.ordered;
        tot_real += val.real;
        tot_available += available;
    });

    rows.sort((a, b) => b.budgeted - a.budgeted || b.real - a.real);
    const tot_expenses_effective = tot_budget - tot_available;
    const tot_pct = tot_budget > 0 ? (tot_expenses_effective / tot_budget) * 100 : 0;

    return {
        total_budget: tot_budget,
        total_committed: tot_committed,
        total_ordered: tot_ordered,
        total_real: tot_real,
        total_available: tot_available,
        execution_pct: tot_pct,
        rows
    };
}
