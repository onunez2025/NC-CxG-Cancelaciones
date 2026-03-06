/**
 * Server-side Relational Cross-Reference Engine (5-Tables Architecture)
 */
import { getDbConnection } from '../db.js';
import sql from 'mssql';

// ─── Types ──────────────────────────────────────────────────────────

export interface EnrichedTransaction {
    id: string;
    po_number: string;
    cost_center: string;
    vendor_code: string;
    vendor_name: string;
    description: string;
    po_value: number;
    currency: string;
    solped: any | null;
    me5a: any | null;
    release_info?: any | null;
    ksb1_entries: any[];
    fbl1n_entries: any[];
    status: 'solicitado' | 'pedido' | 'recibido' | 'facturado' | 'pagado';
    total_real_expense: number;
    total_invoiced: number;
    total_paid: number;
}

export interface TrackingMetrics {
    total_pos: number;
    total_po_value: number;
    total_real_expense: number;
    total_invoiced: number;
    total_paid: number;
    pos_with_solped: number;
    pos_with_invoice: number;
    pos_fully_paid: number;
}

// ─── Direct DB Fetchers ─────────────────────────────────────────────

export async function getRelationalTrackingData(): Promise<{ transactions: EnrichedTransaction[]; metrics: TrackingMetrics }> {
    const pool = await getDbConnection();

    // 1. Obtener los cimientos de la Vista Pre-calculada (ultra rápido)
    const baseResult = await pool.request().query(`SELECT * FROM EBM.vw_EBM_Tracking`);
    const trackingRows = baseResult.recordset;

    if (trackingRows.length === 0) {
        return { transactions: [], metrics: { total_pos: 0, total_po_value: 0, total_real_expense: 0, total_invoiced: 0, total_paid: 0, pos_with_solped: 0, pos_with_invoice: 0, pos_fully_paid: 0 } };
    }

    // 2. Obtener Detalles (ME5K, ME5A, KSB1 y FBL1N expandibles del Frontend)
    const ksbResult = await pool.request().query(`SELECT PoNumber, CostElement, CostElementName, Amount, PostingDate, Description, ReferenceDoc FROM EBM.SAP_KSB1 WHERE PoNumber IS NOT NULL`);
    const fblResult = await pool.request().query(`SELECT PoNumber, DocumentNumber, DocType, PostingDate, AmountLocal, CurrencyLocal, Reference, Description, ClearingDoc FROM EBM.SAP_FBL1N WHERE PoNumber IS NOT NULL AND DocType IN ('01','XK')`);
    const solpedResult = await pool.request().query(`SELECT PoNumber, PrNumber, Description, Quantity, NetValue, RequestDate, GlAccount, ReleaseDate FROM EBM.SAP_ME5K WHERE PoNumber IS NOT NULL`);
    const me5aResult = await pool.request().query(`SELECT PoNumber, PrNumber, Description, Quantity, UnitPrice, TotalValue, CreatedBy, PoDate, ReleaseDate FROM EBM.SAP_ME5A WHERE PoNumber IS NOT NULL`);

    // Indexar arreglos
    const ksbByPo = new Map<string, any[]>();
    ksbResult.recordset.forEach((r: any) => {
        if (!ksbByPo.has(r.PoNumber)) ksbByPo.set(r.PoNumber, []);
        ksbByPo.get(r.PoNumber)!.push({
            cost_element: r.CostElement,
            cost_element_name: r.CostElementName,
            amount: Number(r.Amount) || 0,
            posting_date: r.PostingDate ? r.PostingDate.toISOString() : '',
            description: r.Description,
            reference_doc: r.ReferenceDoc
        });
    });

    const fblByPo = new Map<string, any[]>();
    fblResult.recordset.forEach((r: any) => {
        if (!fblByPo.has(r.PoNumber)) fblByPo.set(r.PoNumber, []);
        const isPaid = (r.ClearingDoc && String(r.ClearingDoc).trim() !== '');
        fblByPo.get(r.PoNumber)!.push({
            document_number: r.DocumentNumber,
            doc_type: r.DocType,
            posting_date: r.PostingDate ? r.PostingDate.toISOString() : '',
            amount: Number(r.AmountLocal) || 0,
            currency: r.CurrencyLocal,
            reference: r.Reference,
            description: r.Description,
            status: isPaid ? 'paid' : 'pending'
        });
    });

    const solpedByPo = new Map<string, any>();
    solpedResult.recordset.forEach((r: any) => {
        if (!solpedByPo.has(r.PoNumber)) {
            const qty = Number(r.Quantity) || 0;
            const netVal = Number(r.NetValue) || 0;
            solpedByPo.set(r.PoNumber, {
                pr_number: r.PrNumber,
                description: r.Description,
                quantity: qty,
                unit_price: qty > 0 ? (netVal / qty) : 0,
                net_value: netVal,
                request_date: r.RequestDate ? r.RequestDate.toISOString() : '',
                release_date: r.ReleaseDate ? r.ReleaseDate.toISOString() : '',
                gl_account: r.GlAccount
            });
        }
    });

    const me5aByPo = new Map<string, any>();
    me5aResult.recordset.forEach((r: any) => {
        if (!me5aByPo.has(r.PoNumber)) {
            me5aByPo.set(r.PoNumber, {
                pr_number: r.PrNumber,
                description: r.Description,
                quantity: Number(r.Quantity) || 0,
                unit_price: Number(r.UnitPrice) || 0,
                total_value: Number(r.TotalValue) || 0,
                created_by: r.CreatedBy,
                po_date: r.PoDate ? r.PoDate.toISOString() : '',
                release_date: r.ReleaseDate ? r.ReleaseDate.toISOString() : ''
            });
        }
    });

    const enriched: EnrichedTransaction[] = [];

    trackingRows.forEach((row: any) => {
        const po = row.PoNumber;
        const kEntries = ksbByPo.get(po) || [];
        const fEntries = fblByPo.get(po) || [];
        const solpedObj = solpedByPo.get(po) || null;
        const me5aObj = me5aByPo.get(po) || null;

        let status: 'solicitado' | 'pedido' | 'recibido' | 'facturado' | 'pagado' = 'pedido';
        if (solpedObj) status = 'solicitado';
        if (row.PoValue > 0) status = 'pedido';
        if (kEntries.length > 0) status = 'recibido';
        if (fEntries.length > 0) status = 'facturado';
        if (fEntries.some(e => e.status === 'paid')) status = 'pagado';

        // Parsear VendorCode a fuerza bruta para compatibilidad si viene nulo
        let vendorCode = String(row.VendorId || '').replace(/\D/g, '');
        let vendorName = String(row.VendorNameStr || row.VendorId || '');

        enriched.push({
            id: po,
            po_number: po,
            cost_center: row.CostCenter || '',
            vendor_code: vendorCode,
            vendor_name: vendorName,
            description: row.Description || 'Sin descripción',
            po_value: Number(row.PoValue) || 0,
            currency: row.Currency || 'PEN',
            solped: solpedObj,
            me5a: me5aObj,
            ksb1_entries: kEntries,
            fbl1n_entries: fEntries,
            status: status,
            total_real_expense: Number(row.TotalRealExpense) || 0,
            total_invoiced: Number(row.TotalInvoiced) || 0,
            total_paid: Number(row.TotalPaid) || 0
        });
    });

    enriched.sort((a, b) => a.po_number.localeCompare(b.po_number));

    const metrics: TrackingMetrics = {
        total_pos: enriched.length,
        total_po_value: enriched.reduce((s, t) => s + t.po_value, 0),
        total_real_expense: enriched.reduce((s, t) => s + t.total_real_expense, 0),
        total_invoiced: enriched.reduce((s, t) => s + t.total_invoiced, 0),
        total_paid: enriched.reduce((s, t) => s + t.total_paid, 0),
        pos_with_solped: enriched.filter(t => t.solped !== null).length,
        pos_with_invoice: enriched.filter(t => t.fbl1n_entries.length > 0).length,
        pos_fully_paid: enriched.filter(t => t.status === 'pagado').length
    };

    return { transactions: enriched, metrics };
}

export interface SolpedItem {
    position: string;
    description: string;
    cost_center: string;
    quantity: number;
    unit_price: number;
    total_value: number;
}

export interface SolpedRow {
    pr_number: string;
    po_number: string;
    description: string;
    cost_center: string;
    gl_account: string;
    quantity: number;
    net_value: number;
    currency: string;
    request_date: string;
    vendor_name: string;
    release_date: string;
    items: SolpedItem[];
    has_po: boolean;
    po_value: number;
    has_ksb1: boolean;
    real_expense: number;
    has_fbl1n: boolean;
    invoice_count: number;
}

export interface VendorSummary {
    code: string;
    name: string;
    po_count: number;
    po_total: number;
    invoice_count: number;
    invoice_total: number;
    paid_total: number;
    pending_total: number;
    cost_centers: string[];
    pos: { po_number: string; value: number; description: string }[];
    invoices: { doc_number: string; date: string; amount: number; status: 'paid' | 'pending'; description: string }[];
}


// TODO: Expand the basic view mapping into the complete interfaces (SolpedRow/VendorSummary) if the frontend requires the deep nested arrays.
// For now, we return a flat structure that the frontend grids can digest directly.

export async function getRelationalSolpedData(): Promise<any[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`SELECT * FROM EBM.vw_EBM_Solped`);
    const me5kResult = await pool.request().query(`SELECT PrNumber, PrItem, CostCenter, Description, Quantity, NetValue, Currency, RequestDate FROM EBM.SAP_ME5K WHERE PrNumber IS NOT NULL`);

    const itemsMap = new Map<string, SolpedItem[]>();

    // Group by PrNumber + PrItem to find true totals for distributed positions
    const positionTotals = new Map<string, { totalValue: number; originalQuantity: number }>();
    me5kResult.recordset.forEach((r: any) => {
        const key = `${r.PrNumber}_${r.PrItem}`;
        if (!positionTotals.has(key)) {
            positionTotals.set(key, { totalValue: 0, originalQuantity: Number(r.Quantity) || 0 });
        }
        positionTotals.get(key)!.totalValue += (Number(r.NetValue) || 0);
    });

    me5kResult.recordset.forEach((r: any) => {
        if (!itemsMap.has(r.PrNumber)) itemsMap.set(r.PrNumber, []);

        const key = `${r.PrNumber}_${r.PrItem}`;
        const totals = positionTotals.get(key)!;
        const val = Number(r.NetValue) || 0;

        // The real unit price for the entire service position
        const realUnitPrice = totals.originalQuantity > 0 ? (totals.totalValue / totals.originalQuantity) : 0;

        // This specific row's proportional quantity based on its value share
        const proportionalQuantity = totals.totalValue > 0 ? (val / totals.totalValue) * totals.originalQuantity : 0;

        itemsMap.get(r.PrNumber)!.push({
            position: String(r.PrItem || ''),
            description: r.Description || '',
            cost_center: r.CostCenter || '',
            quantity: Number(proportionalQuantity.toFixed(4)),
            unit_price: realUnitPrice,
            total_value: val
        });
    });

    return result.recordset.map((row: any) => ({
        pr_number: row.PrNumber || '',
        po_number: row.PoNumber || '',
        description: row.Description || '',
        cost_center: row.CostCenter || '',
        gl_account: row.GlAccount || '',
        quantity: Number(row.Quantity) || 0,
        net_value: Number(row.Value) || 0,
        currency: row.Currency || 'PEN',
        request_date: row.RequestDate ? row.RequestDate.toISOString() : '',
        vendor_name: row.VendorName || '',
        release_date: row.ReleaseDate ? row.ReleaseDate.toISOString() : '',
        has_po: !!row.PoNumber,
        po_value: Number(row.PoValue) || 0,
        status: row.Status || 'solicitado', // from vw
        items: itemsMap.get(row.PrNumber) || [],
        has_ksb1: false, // Legacy fields
        real_expense: 0,
        has_fbl1n: false,
        invoice_count: 0
    }));
}

export async function getRelationalVendorData(): Promise<any[]> {
    const pool = await getDbConnection();
    const result = await pool.request().query(`SELECT * FROM EBM.vw_EBM_Vendor`);

    return result.recordset.map((row: any) => ({
        code: row.VendorCode || '',
        name: row.VendorName || '',
        po_count: Number(row.TotalPos) || 0,
        po_total: Number(row.TotalGenerated) || 0,
        invoice_count: 0, // Not explicitly tracked in simple VW, but derivable
        invoice_total: Number(row.TotalInvoiced) || 0,
        paid_total: Number(row.TotalPaid) || 0,
        pending_total: (Number(row.TotalInvoiced) || 0) - (Number(row.TotalPaid) || 0),
        cost_centers: [],
        pos: [],
        invoices: []
    }));
}
