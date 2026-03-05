/**
 * Relational Server-side Budget Execution Engine
 * 
 * Replaces the old JSON-parsing engine with a direct SQL approach.
 * Performs joins directly against EBM.SAPLineItems for maximum speed.
 */
import { getDbConnection } from '../db.js';
import sql from 'mssql';
import { type BudgetExecutionSummary, type BudgetExecutionRow, type TransactionDetail } from './budgetExecutionEngine.js';

interface ExchangeRate {
    year: number;
    rates: number[];
}

export async function calculateBudgetExecutionRelational(
    year: number,
    managementId: string,
    costCenterId: string | 'all',
    exchangeRates: ExchangeRate[]
): Promise<BudgetExecutionSummary> {
    const pool = await getDbConnection();

    // 1. Obtener Presupuestos (con sus meses)
    let budgetQuery = `
        SELECT 
            b.Id as id,
            a.Code as account_code,
            a.Name as account_name,
            c.Code as ceco_code,
            b.Total as total,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 0) as m1,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 1) as m2,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 2) as m3,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 3) as m4,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 4) as m5,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 5) as m6,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 6) as m7,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 7) as m8,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 8) as m9,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 9) as m10,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 10) as m11,
            (SELECT Amount FROM EBM.BudgetMonths WHERE BudgetId = b.Id AND MonthIndex = 11) as m12
        FROM EBM.Budgets b
        JOIN EBM.AccountingAccounts a ON b.AccountId = a.Id
        JOIN EBM.CostCenters c ON b.CostCenterId = c.Id
        WHERE b.Year = @year AND b.ManagementId = @managementId
    `;

    if (costCenterId !== 'all') {
        budgetQuery += ` AND b.CostCenterId = @cecoId`;
    }

    const budgetRequest = pool.request()
        .input('year', sql.Int, year)
        .input('managementId', sql.UniqueIdentifier, managementId);

    if (costCenterId !== 'all') {
        budgetRequest.input('cecoId', sql.UniqueIdentifier, costCenterId);
    }

    const budgetResult = await budgetRequest.query(budgetQuery);
    const budgets = budgetResult.recordset;

    // 2. Extraer Items de SAP asociadas a esta Gerencia
    // We dynamically apply exchange rates in JS for simplicity, but group in JS is super fast
    // if we only fetch relevant rows, NOT entire files.

    // Obtenemos los códigos de ceco de esta gerencia para filtrar la tabla gigante
    const cecoCodesResult = await pool.request()
        .input('managementId', sql.UniqueIdentifier, managementId)
        .query(`SELECT Code FROM EBM.CostCenters WHERE ManagementId = @managementId AND IsActive = 1`);

    let cecoSet = new Set(cecoCodesResult.recordset.map(r => r.Code.trim().toUpperCase()));
    if (costCenterId !== 'all') {
        const singleCeco = budgets.length > 0 ? budgets[0].ceco_code : '';
        cecoSet = new Set([singleCeco?.trim()?.toUpperCase()]);
    }

    const sapRequest = pool.request();
    // En SQL Server IN clause no funciona con Sets gigantes por defecto, pero como MGT_ID restringe a unos 5-10 cecos, lo haremos manual
    const cecoList = Array.from(cecoSet);
    const cecoPlaceholders = cecoList.map((_, i) => `@c${i}`).join(',');
    cecoList.forEach((c, i) => sapRequest.input(`c${i}`, sql.NVarChar(50), c));

    // Si no hay cecos, retornamos vacio
    const sapQuery = cecoList.length > 0 ? `
        SELECT 
            TransactionType,
            ceco,
            gl_account,
            po_number,
            pr_number,
            vendor,
            val,
            currency,
            doc_date,
            posting_date,
            req_date,
            description,
            reference_doc,
            IsReal,
            IsOrdered,
            IsCommitted
        FROM EBM.vw_SAPLineItemsUnified
        WHERE ceco IN (${cecoPlaceholders})
    ` : `SELECT 1 WHERE 1=0`; // Empty result fallback

    const sapResult = await sapRequest.query(sapQuery);
    const rows = sapResult.recordset;

    // ----- Engine Logic (In-memory grouping, but now ONLY for pre-filtered 
    // structured rows from DB, dropping parsing time and heavy memory JSONs from 10s to ~50ms) -----

    const DEFAULT_RATE = 3.80;
    const getRateForMonthYear = (month: number, rateYear: number): number => {
        const yearRates = exchangeRates.find(r => r.year === rateYear);
        return yearRates?.rates[month] || DEFAULT_RATE;
    };

    const convertToPen = (amount: number, currency: string, targetDate: Date | null): number => {
        if (!amount || isNaN(amount)) return 0;
        const curr = String(currency || '').toUpperCase();
        if (curr !== 'USD') return amount;
        let month = 0;
        let defaultYear = year;
        if (targetDate && !isNaN(targetDate.getTime())) {
            month = targetDate.getMonth();
            defaultYear = targetDate.getFullYear();
        }
        return amount * getRateForMonthYear(month, defaultYear);
    };

    // PO Master Map to trace Ceco across ordered/real
    const poMasterMap = new Map<string, { vendor: string; solped: string; ceco: string }>();
    rows.forEach(row => {
        if (row.IsOrdered) {
            const poNum = (row.po_number || '').trim().toUpperCase();
            if (poNum) {
                if (!poMasterMap.has(poNum)) {
                    poMasterMap.set(poNum, {
                        vendor: (row.vendor || '').trim(),
                        solped: (row.pr_number || '').trim().toUpperCase(),
                        ceco: (row.ceco || '').trim().toUpperCase()
                    });
                }
            }
        }
    });

    const aggregation = new Map<string, {
        budgeted: number;
        committed_total: number;
        ordered_total: number;
        real_total: number;

        // Dynamic maps to track consumption within this account
        po_ordered: Map<string, number>;
        po_real: Map<string, number>;
        solped_committed: Map<string, number>;
        solped_ordered: Map<string, number>;

        monthly_budget: number[];
        monthly_real: number[];
        name: string;
        details: { committed: TransactionDetail[]; ordered: TransactionDetail[]; real: TransactionDetail[] };
    }>();

    const getEntry = (code: string, name: string) => {
        const normCode = (code || '').trim().toUpperCase();
        if (!aggregation.has(normCode)) {
            aggregation.set(normCode, {
                budgeted: 0,
                committed_total: 0,
                ordered_total: 0,
                real_total: 0,
                po_ordered: new Map(),
                po_real: new Map(),
                solped_committed: new Map(),
                solped_ordered: new Map(),
                monthly_budget: Array(12).fill(0),
                monthly_real: Array(12).fill(0),
                name: name || `Cuenta ${normCode}`,
                details: { committed: [], ordered: [], real: [] }
            });
        }
        return aggregation.get(normCode)!;
    };

    // 1. Cargar Budgets
    budgets.forEach(b => {
        const entry = getEntry(b.account_code, b.account_name);
        entry.budgeted += b.total;
        for (let i = 0; i < 12; i++) {
            entry.monthly_budget[i] += Number(b[`m${i + 1}`] || 0);
        }
    });

    // Valid Accounts matching prefix
    const activeAccountsList = Array.from(aggregation.keys());
    const findAccountCode = (rawCode: string) => {
        const target = (rawCode || '').trim().toUpperCase();
        // Exact or EndsWith matching logic to map SAP account to our Catalogue
        const exact = activeAccountsList.find(c => target === c || target.endsWith(c));
        return exact; // If it doesn't match an active budgeted account, we skip (or map to unknown)
    };

    // 2. Procesar SAP
    rows.forEach(row => {
        let ceco = (row.ceco || '').trim().toUpperCase();

        // Recover CeCo from PO if missing in KSB1
        if (!ceco && row.IsReal) {
            const poRef = (row.po_number || row.reference_doc || '').trim().toUpperCase();
            if (poRef && poMasterMap.has(poRef)) {
                ceco = poMasterMap.get(poRef)!.ceco;
            }
        }

        if (!cecoSet.has(ceco)) return;

        const targetCode = findAccountCode(row.gl_account);
        if (!targetCode) return; // Ignore if not budgeted/in catalog for this context

        const entry = getEntry(targetCode, '');
        const baseVal = Number(row.val);
        const curr = row.currency;

        if (row.IsReal) {
            const finalVal = convertToPen(baseVal, curr, row.posting_date);
            entry.real_total += finalVal;

            const poRef = (row.po_number || row.reference_doc || '').trim().toUpperCase();
            if (poRef) {
                entry.po_real.set(poRef, (entry.po_real.get(poRef) || 0) + finalVal);
            }

            const master = poMasterMap.get(poRef);

            entry.details.real.push({
                doc_number: String(row.reference_doc || poRef || ''),
                description: String(row.description || 'Sin descripción'),
                date: row.posting_date ? row.posting_date.toISOString().split('T')[0] : '',
                amount: baseVal, currency: 'PEN',
                reference: '', status: 'real',
                vendor: row.vendor || master?.vendor || undefined,
                related_oc: poRef || undefined,
                related_solped: master?.solped || undefined
            });

            if (row.posting_date) {
                const m = row.posting_date.getMonth();
                if (m >= 0 && m < 12) entry.monthly_real[m] += finalVal;
            }
        }
        else if (row.IsOrdered) {
            const finalVal = convertToPen(baseVal, curr, row.doc_date);
            entry.ordered_total += finalVal;

            const poNum = (row.po_number || '').trim().toUpperCase();
            if (poNum) {
                entry.po_ordered.set(poNum, (entry.po_ordered.get(poNum) || 0) + finalVal);

                // Track this PO against its Solped within this account
                const master = poMasterMap.get(poNum);
                const solpedNum = master?.solped || (row.pr_number || '').trim().toUpperCase();
                if (solpedNum) {
                    entry.solped_ordered.set(solpedNum, (entry.solped_ordered.get(solpedNum) || 0) + finalVal);
                }
            }

            const master = poMasterMap.get(poNum);

            entry.details.ordered.push({
                doc_number: poNum,
                description: String(row.description || 'Sin descripción'),
                date: row.doc_date ? row.doc_date.toISOString().split('T')[0] : '',
                amount: baseVal, currency: 'PEN',
                status: 'pedido',
                vendor: master?.vendor || row.vendor || undefined,
                related_solped: master?.solped || (row.pr_number || '')
            });
        }
        else if (row.IsCommitted) {
            const finalVal = convertToPen(baseVal, curr, row.req_date);
            entry.committed_total += finalVal;

            const prNum = (row.pr_number || '').trim().toUpperCase();
            if (prNum) {
                entry.solped_committed.set(prNum, (entry.solped_committed.get(prNum) || 0) + finalVal);
            }

            entry.details.committed.push({
                doc_number: String(row.pr_number || ''),
                description: String(row.description || 'Sin descripción'),
                date: row.req_date ? row.req_date.toISOString().split('T')[0] : '',
                amount: baseVal, currency: 'PEN', status: 'solicitado',
                vendor: row.vendor || undefined
            });
        }
    });

    // 3. Ensamblar Resultado Final
    const finalRows: BudgetExecutionRow[] = [];
    let tot_budget = 0, tot_committed_eff = 0, tot_ordered_eff = 0, tot_real = 0, tot_available = 0;

    aggregation.forEach((val, code) => {
        // Calculate Effective Ordered: sum of (PO_Ordered - PO_Real) for all POs in this account
        let ordered_effective = 0;
        val.po_ordered.forEach((ordered, po) => {
            const consumed = val.po_real.get(po) || 0;
            ordered_effective += Math.max(0, ordered - consumed);
        });

        // Calculate Effective Committed: sum of (Solped_Value - Solped_Ordered) for all Solpeds in this account
        let committed_effective = 0;
        val.solped_committed.forEach((committed, solped) => {
            const ordered = val.solped_ordered.get(solped) || 0;
            committed_effective += Math.max(0, committed - ordered);
        });

        const real = val.real_total;
        const total_expenses_effective = real + ordered_effective + committed_effective;
        const available = val.budgeted - total_expenses_effective;
        const pct = val.budgeted > 0 ? (total_expenses_effective / val.budgeted) * 100 : 0;

        finalRows.push({
            account_id: code,
            account_code: code,
            account_name: val.name,
            budgeted: val.budgeted,
            committed: committed_effective,
            ordered: ordered_effective,
            real: real,
            available,
            execution_pct: pct,
            monthly_budget: val.monthly_budget,
            monthly_real: val.monthly_real,
            details: val.details
        });

        tot_budget += val.budgeted;
        tot_committed_eff += committed_effective;
        tot_ordered_eff += ordered_effective;
        tot_real += real;
        tot_available += available;
    });

    finalRows.sort((a, b) => b.budgeted - a.budgeted || b.real - a.real);
    const tot_expenses_effective = tot_budget - tot_available;
    const tot_pct = tot_budget > 0 ? (tot_expenses_effective / tot_budget) * 100 : 0;

    return {
        total_budget: tot_budget,
        total_committed: tot_committed_eff,
        total_ordered: tot_ordered_eff,
        total_real: tot_real,
        total_available: tot_available,
        execution_pct: tot_pct,
        rows: finalRows
    };
}
