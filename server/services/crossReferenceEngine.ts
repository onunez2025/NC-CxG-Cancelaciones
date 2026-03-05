/**
 * Server-side Cross-Reference Engine
 * 
 * Ports the browser-side cross-referencing logic to Node.js for performance.
 * This file runs on the server and returns pre-computed results to the frontend.
 */

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
    solped: {
        pr_number: string;
        description: string;
        quantity: number;
        unit_price: number;
        request_date: string;
        net_value: number;
        gl_account: string;
        release_date: string;
    } | null;
    me5a: {
        pr_number: string;
        description: string;
        quantity: number;
        unit_price: number;
        total_value: number;
        created_by: string;
        po_date: string;
        release_date: string;
    } | null;
    release_info?: {
        status: string;
        strategy: string;
    } | null;
    ksb1_entries: {
        cost_element: string;
        cost_element_name: string;
        amount: number;
        posting_date: string;
        description: string;
        reference_doc: string;
    }[];
    fbl1n_entries: {
        document_number: string;
        doc_type: string;
        posting_date: string;
        amount: number;
        currency: string;
        reference: string;
        description: string;
        header_text: string;
        status: 'paid' | 'pending';
    }[];
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

interface UploadData {
    transaction_type: string;
    data: any[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function normalizeKey(value: any): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function extractVendorCode(vendorStr: string): string {
    const trimmed = vendorStr.trim();
    const firstWord = trimmed.split(/\s+/)[0] || '';
    return firstWord.replace(/\D/g, '');
}

function extractVendorName(vendorStr: string): string {
    const trimmed = vendorStr.trim();
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) return trimmed;
    return trimmed.substring(spaceIdx + 1).trim();
}

function formatExcelDate(value: any): string {
    if (!value) return '';
    const num = Number(value);
    if (!isNaN(num) && num > 40000 && num < 60000) {
        const date = new Date((num - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    return String(value);
}

function normalizeRef(s: string): string {
    if (!s) return '';
    let norm = String(s).trim().toUpperCase();
    norm = norm.replace(/^0+(?=.)/, '');
    norm = norm.replace(/-0+([1-9]\d*)$/, '-$1');
    norm = norm.replace(/-0+$/, '-0');
    return norm;
}

function smartMatch(poDesc: string, fblRef: string, fblAsig: string): boolean {
    if (!poDesc) return false;
    const pattern = /([A-Z0-9]+)-([0-9]+)/g;
    const poDescUpper = poDesc.toUpperCase();
    let match;
    const fragments: { s: string; n: string }[] = [];
    while ((match = pattern.exec(poDescUpper)) !== null) {
        fragments.push({ s: normalizeRef(match[1]), n: normalizeRef(match[2]) });
    }
    if (fragments.length === 0) return false;
    const normRef = normalizeRef(fblRef);
    const normAsig = normalizeRef(fblAsig);
    const checkMatch = (normalizedStr: string) => {
        if (!normalizedStr) return false;
        return fragments.some(f => normalizedStr.includes(`${f.s}-${f.n}`));
    };
    return checkMatch(normRef) || checkMatch(normAsig);
}

// ─── Tracking Engine (ported from crossReferenceService.ts) ─────────

export function buildTrackingData(uploads: UploadData[]): { transactions: EnrichedTransaction[]; metrics: TrackingMetrics } {
    const me2kData = (uploads.find(u => u.transaction_type === 'ME2K')?.data || []) as any[];
    const me5kData = (uploads.find(u => u.transaction_type === 'ME5K')?.data || []) as any[];
    const me5aData = (uploads.find(u => u.transaction_type === 'ME5A')?.data || []) as any[];
    const ksb1Data = (uploads.find(u => u.transaction_type === 'KSB1')?.data || []) as any[];
    const fbl1nData = (uploads.find(u => u.transaction_type === 'FBL1N')?.data || []) as any[];

    // Index ME5K by PO number
    const me5kByPO = new Map<string, any>();
    me5kData.forEach(row => {
        const po = normalizeKey(row.po_number);
        if (po) me5kByPO.set(po, row);
    });

    // Index ME5A by PO number
    const me5aByPO = new Map<string, any>();
    me5aData.forEach(row => {
        const po = normalizeKey(row.po_number);
        if (po) me5aByPO.set(po, row);
    });

    // Index KSB1 by PO number (multiple entries per PO)
    const ksb1ByPO = new Map<string, any[]>();
    ksb1Data.forEach(row => {
        const po = normalizeKey(row.po_number);
        if (po) {
            if (!ksb1ByPO.has(po)) ksb1ByPO.set(po, []);
            ksb1ByPO.get(po)!.push(row);
        }
    });

    // Index FBL1N by vendor code (multiple entries per vendor)
    const fbl1nByVendor = new Map<string, any[]>();
    fbl1nData.forEach(row => {
        const vendorCode = extractVendorCode(String(row.vendor_id || ''));
        if (vendorCode) {
            if (!fbl1nByVendor.has(vendorCode)) fbl1nByVendor.set(vendorCode, []);
            fbl1nByVendor.get(vendorCode)!.push(row);
        }
    });

    // Group ME2K rows by PO number
    const me2kByPO = new Map<string, any[]>();
    me2kData.forEach(row => {
        const po = normalizeKey(row.po_number);
        if (po) {
            if (!me2kByPO.has(po)) me2kByPO.set(po, []);
            me2kByPO.get(po)!.push(row);
        }
    });

    const enriched: EnrichedTransaction[] = [];
    const INVOICE_DOC_TYPES = new Set(['01', '02', '03', '05', '08', '14', '46', '50', '54', '99', 'XK']);

    me2kByPO.forEach((poRows, poNumber) => {
        const first = poRows[0];
        const costCenter = String(first.cost_center || '').trim();
        const vendorRaw = String(first.vendor_id || '');
        const vendorCode = extractVendorCode(vendorRaw);
        const vendorName = extractVendorName(vendorRaw);

        // Sum PO values
        const poValue = poRows.reduce((sum: number, r: any) => {
            const orderVal = Number(r.order_value) || 0;
            if (orderVal !== 0) return sum + orderVal;
            const netPrice = Number(r.net_price) || 0;
            const qty = Number(r.ordered_quantity) || Number(r.quantity) || 0;
            if (netPrice > 0 && qty > 0) return sum + (netPrice * qty);
            return sum + netPrice;
        }, 0);

        // Link ME5K
        const solpedRow = me5kByPO.get(poNumber);
        let solped: EnrichedTransaction['solped'] = null;
        if (solpedRow) {
            const rawNetValue = Number(solpedRow.net_value) || 0;
            const rawDist = Number(solpedRow.distribution) || 0;
            const rawQty = Number(solpedRow.quantity) || 0;
            const prNum = String(solpedRow.pr_number || '');

            let netValue = rawNetValue;
            let unitPrice = rawQty > 0 ? rawNetValue / rawQty : 0;

            if (rawNetValue === 0 && rawDist === 0 && prNum) {
                const me5aMatch = me5aData.find((r: any) => String(r.pr_number || '').trim() === prNum);
                if (me5aMatch) {
                    const me5aTotalValue = Number(me5aMatch.total_value) || 0;
                    const me5aUnitPrice = Number(me5aMatch.unit_price) || 0;
                    const me5aQty = Number(me5aMatch.quantity) || 0;
                    netValue = me5aTotalValue || (me5aUnitPrice * me5aQty);
                    unitPrice = me5aUnitPrice || (me5aQty > 0 ? netValue / me5aQty : 0);
                }
            }

            solped = {
                pr_number: prNum,
                description: String(solpedRow.description || ''),
                quantity: rawQty,
                unit_price: unitPrice,
                request_date: formatExcelDate(solpedRow.request_date),
                net_value: netValue,
                gl_account: String(solpedRow.gl_account || ''),
                release_date: formatExcelDate(solpedRow.release_date)
            };
        }

        // Link ME5A
        const me5aRow = me5aByPO.get(poNumber);
        const me5a = me5aRow ? {
            pr_number: String(me5aRow.pr_number || ''),
            description: String(me5aRow.description || ''),
            quantity: Number(me5aRow.quantity) || 0,
            unit_price: Number(me5aRow.unit_price) || 0,
            total_value: Number(me5aRow.total_value) || 0,
            created_by: String(me5aRow.created_by || ''),
            po_date: formatExcelDate(me5aRow.po_date),
            release_date: formatExcelDate(me5aRow.release_date)
        } : null;

        // Release info
        const releaseInfo = first.release_status || first.release_strategy ? {
            status: String(first.release_status || '').trim(),
            strategy: String(first.release_strategy || '').trim()
        } : null;

        // Link KSB1
        const ksb1Rows = ksb1ByPO.get(poNumber) || [];
        const ksb1_entries = ksb1Rows.map((r: any) => ({
            cost_element: String(r.cost_element || ''),
            cost_element_name: String(r.cost_element_name || ''),
            amount: Number(r.amount) || 0,
            posting_date: formatExcelDate(r.posting_date),
            description: String(r.description || ''),
            reference_doc: String(r.reference_doc || '')
        }));
        const totalRealExpense = ksb1_entries.reduce((s: number, e: any) => s + e.amount, 0);

        // Link FBL1N
        const allVendorInvoices = fbl1nByVendor.get(vendorCode) || [];
        const relatedInvoices = allVendorInvoices.filter((r: any) => {
            const docType = String(r.doc_type || '').trim();
            if (docType && !INVOICE_DOC_TYPES.has(docType)) return false;
            const fblPO = String(r.po_number || '').trim();
            if (fblPO && fblPO === poNumber) return true;
            const searchText = `${r.description || ''} ${r.header_text || ''} ${r.assignment || ''} ${r.reference || ''}`;
            if (searchText.includes(poNumber)) return true;
            return smartMatch(first.description, r.reference, r.assignment);
        });

        // Group by document_number
        const groupedByDoc = new Map<string, any[]>();
        relatedInvoices.forEach((r: any) => {
            const docNum = String(r.document_number || '');
            if (!groupedByDoc.has(docNum)) groupedByDoc.set(docNum, []);
            groupedByDoc.get(docNum)!.push(r);
        });

        const docEntries = Array.from(groupedByDoc.entries()).map(([docNum, lines]) => {
            const first_line = lines[0];
            const totalAmount = lines.reduce((sum: number, l: any) => sum + (Number(l.amount_local) || 0), 0);
            const anyCleared = lines.some((l: any) => l.clearing_doc);
            const ref = String(first_line.reference || '');
            return {
                document_number: docNum,
                doc_type: String(first_line.doc_type || ''),
                posting_date: formatExcelDate(first_line.posting_date),
                amount: totalAmount,
                currency: String(first_line.currency_local || 'PEN'),
                reference: ref,
                norm_ref: normalizeRef(ref),
                description: String(first_line.description || first_line.assignment || first_line.header_text || ''),
                header_text: String(first_line.header_text || ''),
                status: (anyCleared ? 'paid' : 'pending') as 'paid' | 'pending'
            };
        });

        // Deduplicate by normalized reference
        const byNormRef = new Map<string, typeof docEntries>();
        docEntries.forEach(entry => {
            const key = entry.norm_ref || entry.document_number;
            if (!byNormRef.has(key)) byNormRef.set(key, []);
            byNormRef.get(key)!.push(entry);
        });

        const fbl1n_entries: typeof docEntries = [];
        byNormRef.forEach(entries => {
            const xkEntries = entries.filter(e => e.doc_type === 'XK');
            if (xkEntries.length > 0) {
                fbl1n_entries.push(xkEntries[0]);
            } else {
                fbl1n_entries.push(entries[0]);
            }
        });

        const totalInvoiced = fbl1n_entries.reduce((s, e) => s + Math.abs(e.amount), 0);
        const totalPaid = fbl1n_entries.filter(e => e.status === 'paid').reduce((s, e) => s + Math.abs(e.amount), 0);

        // Compute lifecycle status
        let status: EnrichedTransaction['status'] = 'pedido';
        if (solped || me5a) status = 'solicitado';
        if (poValue > 0) status = 'pedido';
        if (ksb1_entries.length > 0) status = 'recibido';
        if (fbl1n_entries.length > 0) status = 'facturado';
        if (fbl1n_entries.some((e: any) => e.status === 'paid')) status = 'pagado';

        enriched.push({
            id: poNumber,
            po_number: poNumber,
            cost_center: costCenter,
            vendor_code: vendorCode,
            vendor_name: vendorName,
            description: first.description || solped?.description || me5a?.description || 'Sin descripción',
            po_value: poValue,
            currency: 'PEN',
            solped,
            me5a,
            release_info: releaseInfo,
            ksb1_entries,
            fbl1n_entries,
            status,
            total_real_expense: totalRealExpense,
            total_invoiced: totalInvoiced,
            total_paid: totalPaid
        });
    });

    enriched.sort((a, b) => a.po_number.localeCompare(b.po_number));

    const metrics: TrackingMetrics = {
        total_pos: enriched.length,
        total_po_value: enriched.reduce((s, t) => s + t.po_value, 0),
        total_real_expense: enriched.reduce((s, t) => s + t.total_real_expense, 0),
        total_invoiced: enriched.reduce((s, t) => s + t.total_invoiced, 0),
        total_paid: enriched.reduce((s, t) => s + t.total_paid, 0),
        pos_with_solped: enriched.filter(t => t.solped !== null || t.me5a !== null).length,
        pos_with_invoice: enriched.filter(t => t.fbl1n_entries.length > 0).length,
        pos_fully_paid: enriched.filter(t => t.status === 'pagado').length
    };

    return { transactions: enriched, metrics };
}

// ─── Solped Engine (ported from SolpedPage.tsx loadData) ─────────────

export function buildSolpedData(uploads: UploadData[]): SolpedRow[] {
    const me5kData = (uploads.find(u => u.transaction_type === 'ME5K')?.data || []) as any[];
    const me5aData = (uploads.find(u => u.transaction_type === 'ME5A')?.data || []) as any[];
    const me2kData = (uploads.find(u => u.transaction_type === 'ME2K')?.data || []) as any[];
    const ksb1Data = (uploads.find(u => u.transaction_type === 'KSB1')?.data || []) as any[];
    const fbl1nData = (uploads.find(u => u.transaction_type === 'FBL1N')?.data || []) as any[];

    // Index ME2K by PO
    const me2kByPO = new Map<string, any[]>();
    me2kData.forEach(r => {
        const po = String(r.po_number || '').trim();
        if (po) {
            if (!me2kByPO.has(po)) me2kByPO.set(po, []);
            me2kByPO.get(po)!.push(r);
        }
    });

    // Index KSB1 by PO
    const ksb1ByPO = new Map<string, any[]>();
    ksb1Data.forEach(r => {
        const po = String(r.po_number || '').trim();
        if (po) {
            if (!ksb1ByPO.has(po)) ksb1ByPO.set(po, []);
            ksb1ByPO.get(po)!.push(r);
        }
    });

    // Index FBL1N by vendor code + build vendor master
    const fbl1nByVendor = new Map<string, any[]>();
    const vendorMasterNames = new Map<string, string>();

    const extractFromVendorStr = (vRaw: string) => {
        if (!vRaw) return;
        const code = vRaw.trim().split(/\s+/)[0]?.replace(/\D/g, '') || '';
        const spaceIdx = vRaw.trim().indexOf(' ');
        const name = spaceIdx > -1 ? vRaw.trim().substring(spaceIdx + 1).trim() : '';
        if (code && name) vendorMasterNames.set(code, name);
    };

    me2kData.forEach(r => extractFromVendorStr(String(r.vendor_id || '')));
    fbl1nData.forEach(r => extractFromVendorStr(String(r.vendor_id || '')));

    fbl1nData.forEach(r => {
        const vc = String(r.vendor_id || '').trim().split(/\s+/)[0]?.replace(/\D/g, '') || '';
        if (vc) {
            if (!fbl1nByVendor.has(vc)) fbl1nByVendor.set(vc, []);
            fbl1nByVendor.get(vc)!.push(r);
        }
    });

    // Aggregate ME5A rows by PR number
    const me5aGrouped = new Map<string, any[]>();
    me5aData.forEach(row => {
        const pr = String(row.pr_number || '').trim();
        if (pr) {
            if (!me5aGrouped.has(pr)) me5aGrouped.set(pr, []);
            me5aGrouped.get(pr)!.push(row);
        }
    });

    const solpedMap = new Map<string, SolpedRow>();

    // Helper: resolve vendor name
    const resolveVendor = (me2kRows: any[] | undefined, prNumber: string): { code: string; name: string } => {
        let vendorCode = '';
        let vendorName = '';
        if (me2kRows && me2kRows.length > 0) {
            const vRaw = String(me2kRows[0].vendor_id || '');
            vendorCode = vRaw.trim().split(/\s+/)[0]?.replace(/\D/g, '') || '';
            const spaceIdx = vRaw.trim().indexOf(' ');
            vendorName = spaceIdx > -1 ? vRaw.trim().substring(spaceIdx + 1).trim() : vRaw.trim();
        }
        if (!vendorName && prNumber && me5aGrouped.has(prNumber)) {
            const me5aRows = me5aGrouped.get(prNumber)!;
            const me5a = me5aRows[0];
            let vVal = String(me5a.vendor_name || me5a.desired_vendor || '').trim();
            if (/^\d+$/.test(vVal)) {
                vendorName = vendorMasterNames.get(vVal) || vVal;
            } else {
                vendorName = vVal;
            }
        }
        return { code: vendorCode, name: vendorName };
    };

    // Phase 1: Process ME5K
    me5kData.forEach(s => {
        const prNumber = String(s.pr_number || '').trim();
        const poNumber = String(s.po_number || '').trim();
        const key = prNumber || poNumber;
        if (!key) return;

        const position = String(s.pr_item || '').trim();
        const val = Number(s.net_value) || 0;
        const qty = Number(s.quantity) || 0;
        const currency = String(s.currency || 'PEN').trim().toUpperCase();

        const item: SolpedItem = {
            position,
            description: String(s.description || ''),
            cost_center: String(s.cost_center || '').trim(),
            quantity: qty,
            unit_price: qty > 0 ? val / qty : val,
            total_value: val
        };

        if (solpedMap.has(key)) {
            const existing = solpedMap.get(key)!;
            existing.items.push(item);
            existing.net_value += val;
            existing.quantity += qty;
            if (existing.currency === 'PEN' && currency !== 'PEN') {
                existing.currency = currency;
            }
        } else {
            const me2kRows = poNumber ? me2kByPO.get(poNumber) : undefined;
            const ksb1Rows = poNumber ? ksb1ByPO.get(poNumber) : undefined;
            const vendor = resolveVendor(me2kRows, prNumber);
            const fbl1nRows = vendor.code ? fbl1nByVendor.get(vendor.code) : undefined;
            const poValue = me2kRows?.reduce((sum: number, r: any) => sum + (Number(r.order_value) || Number(r.net_price) || Number(r.net_value) || 0), 0) || 0;
            const realExpense = ksb1Rows?.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0) || 0;

            solpedMap.set(key, {
                pr_number: prNumber,
                po_number: poNumber,
                description: String(s.description || ''),
                cost_center: String(s.cost_center || '').trim(),
                gl_account: String(s.gl_account || ''),
                quantity: qty,
                net_value: val,
                currency,
                request_date: s.request_date,
                release_date: s.release_date,
                vendor_name: vendor.name || String(s.vendor_name || ''),
                items: [item],
                has_po: !!me2kRows && me2kRows.length > 0,
                po_value: poValue,
                has_ksb1: !!ksb1Rows && ksb1Rows.length > 0,
                real_expense: realExpense,
                has_fbl1n: !!fbl1nRows && fbl1nRows.length > 0,
                invoice_count: fbl1nRows?.length || 0
            });
        }
    });

    // Phase 2: Rescue values from ME5A
    me5aGrouped.forEach((me5aRows, prNumber) => {
        if (solpedMap.has(prNumber)) {
            const existing = solpedMap.get(prNumber)!;
            const ceCosFromME5K = new Map<string, Set<string>>();
            existing.items.forEach(item => {
                if (item.position && item.cost_center) {
                    if (!ceCosFromME5K.has(item.position)) {
                        ceCosFromME5K.set(item.position, new Set());
                    }
                    ceCosFromME5K.get(item.position)!.add(item.cost_center);
                }
            });

            let totalFromMe5a = 0;
            const rescuedItems: SolpedItem[] = [];
            me5aRows.forEach(a => {
                const pos = String(a.pr_item || '').trim();
                const tv = Number(a.total_value) || (Number(a.quantity || 0) * Number(a.unit_price || 0));
                totalFromMe5a += tv;
                const cecoSet = ceCosFromME5K.get(pos);
                const ceco = cecoSet ? [...cecoSet].join(' / ') : '';
                rescuedItems.push({
                    position: pos,
                    description: String(a.description || ''),
                    cost_center: ceco,
                    quantity: Number(a.quantity) || 0,
                    unit_price: Number(a.unit_price) || 0,
                    total_value: tv
                });
            });
            existing.net_value = totalFromMe5a;
            const me5aCurrency = String(me5aRows[0].currency || '').trim().toUpperCase();
            const existingCurrency = existing.currency && existing.currency !== 'PEN' ? existing.currency : '';
            existing.currency = me5aCurrency || existingCurrency || 'PEN';
            if (!existing.release_date && me5aRows[0].release_date) {
                existing.release_date = me5aRows[0].release_date;
            }
            if (rescuedItems.length > 0) {
                existing.items = rescuedItems;
                existing.quantity = rescuedItems.reduce((s, i) => s + i.quantity, 0);
            }
        } else {
            // PR only exists in ME5A
            const poNumber = String(me5aRows[0].po_number || '').trim();
            const me2kRows = poNumber ? me2kByPO.get(poNumber) : undefined;
            const poValue = me2kRows?.reduce((sum: number, r: any) => sum + (Number(r.order_value) || Number(r.net_price) || Number(r.net_value) || 0), 0) || 0;

            let derivedCeCo = '';
            let derivedVendor = '';
            let derivedAccount = '';

            if (me2kRows && me2kRows.length > 0) {
                derivedCeCo = String(me2kRows[0].cost_center || '').trim();
                derivedAccount = String(me2kRows[0].gl_account || '').trim();
                const vRaw = String(me2kRows[0].vendor_id || '');
                const spaceIdx = vRaw.trim().indexOf(' ');
                derivedVendor = spaceIdx > -1 ? vRaw.trim().substring(spaceIdx + 1).trim() : vRaw.trim();
            }

            let totalValue = 0;
            let totalQty = 0;
            const items: SolpedItem[] = [];

            me5aRows.forEach(a => {
                const pos = String(a.pr_item || '').trim();
                const tv = Number(a.total_value) || (Number(a.quantity || 0) * Number(a.unit_price || 0));
                totalValue += tv;
                const qty = Number(a.quantity) || 0;
                totalQty += qty;
                items.push({
                    position: pos,
                    description: String(a.description || ''),
                    cost_center: '',
                    quantity: qty,
                    unit_price: Number(a.unit_price) || 0,
                    total_value: tv
                });
            });

            solpedMap.set(prNumber, {
                pr_number: prNumber,
                po_number: poNumber,
                description: String(me5aRows[0].description || ''),
                cost_center: derivedCeCo,
                gl_account: derivedAccount,
                quantity: totalQty,
                net_value: totalValue,
                currency: String(me5aRows[0].currency || 'PEN').trim().toUpperCase(),
                request_date: me5aRows[0].po_date || me5aRows[0].request_date,
                release_date: me5aRows[0].release_date,
                vendor_name: derivedVendor,
                items,
                has_po: !!me2kRows && me2kRows.length > 0,
                po_value: poValue,
                has_ksb1: false,
                real_expense: 0,
                has_fbl1n: false,
                invoice_count: 0
            });
        }
    });

    const solpedRows = Array.from(solpedMap.values());

    // Update descriptions for multi-item Solpeds
    solpedRows.forEach(r => {
        if (r.items.length > 1) {
            r.description = `${r.items[0].description} (+${r.items.length - 1} ítems)`;
            const uniqueItemCecos = new Set(r.items.map(i => i.cost_center).filter(Boolean));
            if (uniqueItemCecos.size > 1) {
                r.cost_center = 'Múltiples CeCos';
            }
        }
    });

    solpedRows.sort((a, b) => (b.pr_number || b.po_number).localeCompare(a.pr_number || a.po_number));
    return solpedRows;
}

// ─── Vendor Engine (ported from VendorsPage.tsx loadData) ────────────

export function buildVendorData(uploads: UploadData[]): VendorSummary[] {
    const me2kData = (uploads.find(u => u.transaction_type === 'ME2K')?.data || []) as any[];
    const fbl1nData = (uploads.find(u => u.transaction_type === 'FBL1N')?.data || []) as any[];

    const vendorMap = new Map<string, VendorSummary>();

    me2kData.forEach(row => {
        const vendorRaw = String(row.vendor_id || '').trim();
        const code = vendorRaw.split(/\s+/)[0]?.replace(/\D/g, '') || '';
        if (!code) return;
        const spaceIdx = vendorRaw.indexOf(' ');
        const name = spaceIdx > -1 ? vendorRaw.substring(spaceIdx + 1).trim() : code;
        const poNumber = String(row.po_number || '').trim();
        const poValue = Number(row.order_value) || Number(row.net_price) || Number(row.net_value) || 0;
        const costCenter = String(row.cost_center || '').trim();

        if (!vendorMap.has(code)) {
            vendorMap.set(code, {
                code, name,
                po_count: 0, po_total: 0,
                invoice_count: 0, invoice_total: 0,
                paid_total: 0, pending_total: 0,
                cost_centers: [], pos: [], invoices: []
            });
        }

        const v = vendorMap.get(code)!;
        if (poNumber && !v.pos.some(p => p.po_number === poNumber)) {
            v.pos.push({ po_number: poNumber, value: poValue, description: String(row.description || '') });
            v.po_count++;
            v.po_total += poValue;
        }
        if (costCenter && !v.cost_centers.includes(costCenter)) {
            v.cost_centers.push(costCenter);
        }
    });

    fbl1nData.forEach(row => {
        const vendorCode = String(row.vendor_id || '').trim().split(/\s+/)[0]?.replace(/\D/g, '') || '';
        if (!vendorCode) return;
        const v = vendorMap.get(vendorCode);
        if (!v) return;
        const amount = Math.abs(Number(row.amount_local) || 0);
        const isPaid = !!row.clearing_doc;
        const docNumber = String(row.document_number || '');

        v.invoices.push({
            doc_number: docNumber,
            date: row.posting_date,
            amount,
            status: isPaid ? 'paid' : 'pending',
            description: String(row.description || row.header_text || '')
        });
        v.invoice_count++;
        v.invoice_total += amount;
        if (isPaid) v.paid_total += amount;
        else v.pending_total += amount;
    });

    return [...vendorMap.values()];
}
