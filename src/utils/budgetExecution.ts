import { BudgetService } from '../services/budgetService';
import { SapParserService } from '../services/sapParserService';
import { CostCentersService } from '../services/costCentersService';
import { AccountsService } from '../services/accountsService';
import { ExchangeRatesService } from '../services/exchangeRatesService';


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

    // Monetary values
    budgeted: number;
    committed: number;     // Solped (ME5K/ME5A)
    ordered: number;       // OC (ME2K)
    real: number;          // Ejecutado (KSB1/FBL1N)

    // Computed
    available: number;     // budgeted - (real + ordered + committed)
    execution_pct: number;

    // Monthly breakdown
    monthly_budget: number[];
    monthly_real: number[];

    // Detailed transactions for drill-down
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

/**
 * Calculates budget execution metrics for a specific management and year.
 * Optionally filters by a specific Cost Center.
 */
export const calculateBudgetExecution = async (
    year: number,
    managementId: string,
    costCenterId?: string | 'all'
): Promise<BudgetExecutionSummary> => {
    // 1. Get Base Data
    const [allBudgets, accounts, allCecos, uploads] = await Promise.all([
        BudgetService.getBudgets(year, managementId),
        AccountsService.getAccounts(),
        CostCentersService.getCostCenters(),
        SapParserService.getAllUploadsFull()
    ]);

    // Helper: Normalize keys for robust matching
    const normalize = (val: unknown) => String(val || '').trim().toUpperCase();

    // Helper: Format Excel date
    const formatDate = (val: unknown) => {
        if (!val) return '';
        const num = Number(val);
        if (!isNaN(num) && num > 40000 && num < 60000) {
            const date = new Date((num - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }
        return String(val);
    };

    // 2. Filter CeCos relevant to this request
    const relevantCecoCodes = new Set<string>();

    if (costCenterId && costCenterId !== 'all') {
        const ceco = allCecos.find(c => c.id === costCenterId);
        if (ceco) relevantCecoCodes.add(normalize(ceco.code));
    } else {
        const managementCecos = allCecos.filter(c => c.management_id === managementId && c.is_active);
        managementCecos.forEach(c => relevantCecoCodes.add(normalize(c.code)));
    }

    // 3. Extract & Filter Transaction Data (Solped, OC, Real)

    // 3a. Committed (Solped - ME5K)
    const solpedUpload = uploads.find(u => u.transaction_type === 'ME5K') || uploads.find(u => u.transaction_type === 'ME5A');
    const solpedRows = (solpedUpload?.data || []) as Record<string, unknown>[];

    // Load ME5A for fallback values (Solped value rescue)
    const me5aUpload = uploads.find(u => u.transaction_type === 'ME5A');
    const me5aRows = (me5aUpload?.data || []) as Record<string, unknown>[];

    // Index ME5A by PR Number for fast lookup
    const me5aMap = new Map<string, Record<string, unknown>>();
    me5aRows.forEach(row => {
        const pr = normalize(row.pr_number);
        if (pr) me5aMap.set(pr, row);
    });

    // 3b. Ordered (OC - ME2K)
    const ocUpload = uploads.find(u => u.transaction_type === 'ME2K');
    const ocRows = (ocUpload?.data || []) as Record<string, unknown>[];

    // 3c. Real (FBL1N / KSB1)
    const realUpload = uploads.find(u => u.transaction_type === 'KSB1') || uploads.find(u => u.transaction_type === 'FBL1N');
    const realRows = (realUpload?.data || []) as Record<string, unknown>[];

    // ─── NEW: Build Master PO Map for linking ───
    // Map PO Number -> { vendor, solped }
    const poMasterMap = new Map<string, { vendor: string, solped: string, ceco: string }>();

    ocRows.forEach(row => {
        const poNum = normalize(row.po_number);
        if (!poNum) return;

        // Try to get vendor name, fallback to code
        const vendorName = String(row.vendor_name || row.vendor_id || '').trim();
        const solpedNum = normalize(row.pr_number);
        const ceco = normalize(row.cost_center);

        if (!poMasterMap.has(poNum)) {
            poMasterMap.set(poNum, { vendor: vendorName, solped: solpedNum, ceco });
        }
    });
    // ────────────────────────────────────────────

    // 4. Aggregation Map by Account Code
    const aggregation = new Map<string, {
        budgeted: number;
        committed: number;          // Display value (Total Solped)
        committed_effective: number; // Calculation value (Solped without PO)
        ordered: number;
        real: number;
        monthly_budget: number[];
        monthly_real: number[];
        details: {
            committed: TransactionDetail[];
            ordered: TransactionDetail[];
            real: TransactionDetail[];
        };
    }>();

    // Helper for currency conversion based on document date
    const convertToPen = (amount: number, currency: string | undefined, excelDate: string | number | undefined): number => {
        if (!amount || isNaN(amount)) return 0;
        const curr = String(currency || '').toUpperCase();
        if (curr !== 'USD') return amount; // Assume PEN 

        let month = 0; // Default Jan
        let defaultYear = year; // Use the budget year context

        const numDate = Number(excelDate);
        if (!isNaN(numDate) && numDate > 40000 && numDate < 60000) {
            const date = new Date((numDate - 25569) * 86400 * 1000);
            month = date.getMonth();
            defaultYear = date.getFullYear();
        }

        const rate = ExchangeRatesService.getRateForMonthYear(month, defaultYear);
        return amount * rate;
    };

    const getEntry = (code: string) => {
        // Ensure account code is normalized for map key
        const normCode = normalize(code);
        if (!aggregation.has(normCode)) {
            aggregation.set(normCode, {
                budgeted: 0,
                committed: 0,
                committed_effective: 0, // Init
                ordered: 0,
                real: 0,
                monthly_budget: Array(12).fill(0),
                monthly_real: Array(12).fill(0),
                details: {
                    committed: [],
                    ordered: [],
                    real: []
                }
            });
        }
        return aggregation.get(normCode)!;
    };

    // Helper: Find account by code with strict normalization
    const findAccount = (rawCode: string) => {
        const target = normalize(rawCode);
        return accounts.find(a => {
            const accCode = normalize(a.code);
            return target === accCode || target.endsWith(accCode);
        });
    };

    // 5. Process Budgets
    allBudgets.forEach((b) => {
        if (costCenterId && costCenterId !== 'all' && b.cost_center_id !== costCenterId) return;

        const account = accounts.find((a) => a.id === b.account_id);
        if (!account) return;

        const entry = getEntry(account.code); // Account codes in system are trusted
        entry.budgeted += b.total;
        b.monthly_amounts.forEach((amt: number, idx: number) => entry.monthly_budget[idx] += amt);
    });

    // 6. Process Solpeds (Committed)
    solpedRows.forEach(row => {
        const ceco = normalize(row.cost_center);
        if (!relevantCecoCodes.has(ceco)) return;

        const accountCode = String(row.gl_account || row.cost_element || '').trim();
        const account = findAccount(accountCode);

        if (account) {
            const entry = getEntry(account.code);

            // Value Logic: Try ME5K Net Value, then fallback to ME5A Total Value
            let val = Number(row.net_value || row.amount || row.total_value || 0);

            if (val === 0) {
                const prNum = normalize(row.pr_number);
                if (prNum && me5aMap.has(prNum)) {
                    const me5aRow = me5aMap.get(prNum);
                    val = Number(me5aRow.total_value) ||
                        (Number(me5aRow.quantity || 0) * Number(me5aRow.unit_price || 0));
                }
            }

            if (!isNaN(val) && val !== 0) {
                // Apply USD conversion if needed
                const currency = String(row.currency || 'PEN').toUpperCase();
                const dateRaw = row.release_date || row.request_date;
                const finalVal = convertToPen(val, currency, dateRaw);

                // ALWAYS add to display committed (History flow)
                entry.committed += finalVal;

                // ONLY add to effective committed if NO PO generated (Avoid double counting in available)
                const hasPO = row.po_number && String(row.po_number).trim() !== '';
                if (!hasPO) {
                    entry.committed_effective += finalVal;
                }

                // Try to find vendor if possible (ME5K 'fixed_vendor')
                const vendor = String(row.vendor_name || row.fixed_vendor || row.vendor_id || '').trim();

                entry.details.committed.push({
                    doc_number: String(row.pr_number || ''),
                    description: String(row.description || 'Sin descripción'),
                    date: formatDate(row.request_date),
                    amount: val,
                    currency: 'PEN',
                    status: 'solicitado',
                    vendor: vendor || undefined
                });
            }
        }
    });

    // 7. Process OCs (Ordered)
    ocRows.forEach(row => {
        const ceco = normalize(row.cost_center);
        if (!relevantCecoCodes.has(ceco)) return;

        const accountCode = String(row.gl_account || '').trim();
        const account = findAccount(accountCode);

        if (account) {
            const entry = getEntry(account.code);
            // Fix: Use logic from CrossReferenceService (Quantity * Price if Net Value is 0)
            let val = Number(row.order_value || row.net_value || 0);

            if (val === 0) {
                const qty = Number(row.ordered_quantity || row.quantity || 0);
                const price = Number(row.net_price || 0);
                if (qty > 0 && price > 0) {
                    val = qty * price;
                }
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
                    amount: val,
                    currency: 'PEN',
                    reference: String(row.vendor_id || ''),
                    status: 'pedido',
                    vendor: master?.vendor || String(row.vendor_id || ''),
                    related_solped: master?.solped || String(row.pr_number || '')
                });
            }
        }
    });

    // 8. Process Real (Executed)
    realRows.forEach(row => {
        // Try strict CeCo first
        let ceco = normalize(row.cost_center);

        // Fallback: If CeCo is missing/empty, try to inherit from PO (ME2K match)
        // This aligns logic with "Tracking" module which centers on POs
        if (!ceco) {
            // Documento compras (KSB1) or Reference Doc (FBL1N sometimes)
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

                // Inherited vendor from PO if not present in row
                const rowVendor = String(row.vendor_name || row.vendor_id || '').trim();
                const finalVendor = rowVendor || master?.vendor;

                // Add to detail list
                entry.details.real.push({
                    doc_number: String(row.document_number || row.reference_doc || ''),
                    description: String(row.description || row.header_text || 'Sin descripción'),
                    date: formatDate(row.posting_date),
                    amount: val,
                    currency: 'PEN',
                    reference: String(row.vendor_id || ''),
                    status: 'real',
                    vendor: finalVendor || undefined,
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

    // 9. Transform Map to Array & Calculate Totals
    const rows: BudgetExecutionRow[] = [];
    let tot_budget = 0;
    let tot_committed = 0;
    let tot_ordered = 0;
    let tot_real = 0;
    let tot_available = 0; // Accumulate explicit available

    aggregation.forEach((val, code) => {
        // Find account info again for display
        const account = accounts.find(a => normalize(a.code) === code);
        const name = account ? account.name : `Unknown (${code})`;
        const id = account ? account.id : code;
        const displayCode = account ? account.code : code; // Prefer system code format

        // Calculate available using EFFECTIVE committed (Solpeds without PO)
        // But displayed pct uses TOTAL committed (Visual flow)?? 
        // No, typically % execution is Real / Budget or (Real+Ordered+Committed)/Budget.
        // If we want accurate Available, we must use effective.
        const total_expenses_effective = val.real + val.ordered + val.committed_effective;

        // However, for the UI "Committed" column, we want to show ALL Solpeds (val.committed).

        const available = val.budgeted - total_expenses_effective;
        const pct = val.budgeted > 0 ? (total_expenses_effective / val.budgeted) * 100 : 0;

        rows.push({
            account_id: id,
            account_code: displayCode,
            account_name: name,
            budgeted: val.budgeted,
            committed: val.committed, // SHOW ALL (User Request)
            ordered: val.ordered,
            real: val.real,
            available: available,     // CORRECT LOGIC
            execution_pct: pct,
            monthly_budget: val.monthly_budget,
            monthly_real: val.monthly_real,
            details: val.details
        });

        tot_budget += val.budgeted;
        tot_committed += val.committed; // Show Total Committed in summary too? Or Effective? Usually consistent with rows.
        tot_ordered += val.ordered;
        tot_real += val.real;
        tot_available += available;
    });

    // Sort by largest budget, then largest real
    rows.sort((a, b) => b.budgeted - a.budgeted || b.real - a.real);

    // Re-calculate total pct based on effective totals
    // We accumulated tot_available, so we can back-derive effective expenses or just sum them.
    const tot_expenses_effective = tot_budget - tot_available;
    const tot_pct = tot_budget > 0 ? (tot_expenses_effective / tot_budget) * 100 : 0;

    return {
        total_budget: tot_budget,
        total_committed: tot_committed, // Summaries usually sum the columns. 
        total_ordered: tot_ordered,
        total_real: tot_real,
        total_available: tot_available,
        execution_pct: tot_pct,
        rows
    };
};
