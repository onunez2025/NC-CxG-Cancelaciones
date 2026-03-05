// Verification: simulate the exact deduplication algorithm from crossReferenceService.ts
const XLSX = require('xlsx');

function normalizeRef(s) {
    if (!s) return '';
    let norm = String(s).trim().toUpperCase();
    norm = norm.replace(/^0+(?=.)/, '');
    norm = norm.replace(/-0+([1-9]\d*)$/, '-$1');
    norm = norm.replace(/-0+$/, '-0');
    return norm;
}

function smartMatch(poDesc, fblRef, fblAsig) {
    if (!poDesc) return false;
    const pattern = /([A-Z0-9]+)-([0-9]+)/g;
    const poDescUpper = poDesc.toUpperCase();
    let match;
    const fragments = [];
    while ((match = pattern.exec(poDescUpper)) !== null) {
        fragments.push({ s: normalizeRef(match[1]), n: normalizeRef(match[2]) });
    }
    if (fragments.length === 0) return false;
    const normRef = normalizeRef(fblRef);
    const normAsig = normalizeRef(fblAsig);
    const checkMatch = (normalizedStr) => {
        if (!normalizedStr) return false;
        return fragments.some(f => normalizedStr.includes(`${f.s}-${f.n}`));
    };
    return checkMatch(normRef) || checkMatch(normAsig);
}

const INVOICE_DOC_TYPES = new Set(['01', '02', '03', '05', '08', '14', '46', '50', '54', '99', 'XK']);

const fblWb = XLSX.readFile('D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx');
const fblData = XLSX.utils.sheet_to_json(fblWb.Sheets[fblWb.SheetNames[0]], { header: 1 });
const H = fblData[0];
const ci = {
    vendor: H.indexOf('Proveedor'),
    docNum: H.indexOf('Nº documento'),
    docType: H.indexOf('Clase de documento'),
    ref: H.indexOf('Referencia'),
    asig: H.indexOf('Asignación'),
    amountLocal: H.indexOf('Importe en moneda local'),
    clearingDoc: H.indexOf('Doc.compensación'),
    text: H.indexOf('Texto'),
    headerText: H.indexOf('Texto cab.documento'),
    poNumber: H.indexOf('Documento compras'),
};

function simulateForPO(poNumber, vendorCode, poDesc) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`OC: ${poNumber} | Vendor: ${vendorCode} | Desc: "${poDesc}"`);
    console.log('='.repeat(60));

    // Get vendor invoices
    const vendorRows = fblData.filter((r, i) => i > 0 && String(r[ci.vendor] || '').includes(vendorCode));

    // Filter by doc type
    const invoiceRows = vendorRows.filter(r => {
        const dt = String(r[ci.docType] || '').trim();
        return !dt || INVOICE_DOC_TYPES.has(dt);
    });

    // Smart match
    const matchedRows = invoiceRows.filter(r => {
        const fblPO = String(r[ci.poNumber] || '').trim();
        if (fblPO && fblPO === poNumber) return true;
        const searchText = `${r[ci.text] || ''} ${r[ci.headerText] || ''} ${r[ci.asig] || ''} ${r[ci.ref] || ''}`;
        if (searchText.includes(poNumber)) return true;
        return smartMatch(poDesc, String(r[ci.ref] || ''), String(r[ci.asig] || ''));
    });

    console.log(`\nStep 1 - Matched rows: ${matchedRows.length}`);

    // Group by doc number
    const groupedByDoc = new Map();
    matchedRows.forEach(r => {
        const docNum = String(r[ci.docNum] || '');
        if (!groupedByDoc.has(docNum)) groupedByDoc.set(docNum, []);
        groupedByDoc.get(docNum).push(r);
    });

    const docEntries = Array.from(groupedByDoc.entries()).map(([docNum, lines]) => {
        const first_line = lines[0];
        const totalAmount = lines.reduce((sum, l) => sum + (Number(l[ci.amountLocal]) || 0), 0);
        const anyCleared = lines.some(l => l[ci.clearingDoc]);
        const ref = String(first_line[ci.ref] || '');
        return {
            document_number: docNum,
            doc_type: String(first_line[ci.docType] || ''),
            amount: totalAmount,
            reference: ref,
            norm_ref: normalizeRef(ref),
            status: anyCleared ? 'paid' : 'pending'
        };
    });

    console.log(`Step 2 - Grouped by doc: ${docEntries.length} documents`);
    docEntries.forEach(e => console.log(`  ${e.doc_type} Doc:${e.document_number} ref="${e.reference}" norm="${e.norm_ref}" amt=${e.amount.toFixed(2)} [${e.status}]`));

    // Deduplicate by normalized reference
    const byNormRef = new Map();
    docEntries.forEach(entry => {
        const key = entry.norm_ref || entry.document_number;
        if (!byNormRef.has(key)) byNormRef.set(key, []);
        byNormRef.get(key).push(entry);
    });

    const fbl1n_entries = [];
    byNormRef.forEach(entries => {
        const xkEntries = entries.filter(e => e.doc_type === 'XK');
        if (xkEntries.length > 0) {
            fbl1n_entries.push(xkEntries[0]);
        } else {
            fbl1n_entries.push(entries[0]);
        }
    });

    console.log(`\nStep 3 - After deduplication: ${fbl1n_entries.length} invoice(s)`);
    fbl1n_entries.forEach(e => console.log(`  ✅ ${e.doc_type} Doc:${e.document_number} ref="${e.norm_ref}" amt=S/ ${Math.abs(e.amount).toFixed(2)} [${e.status}]`));

    const totalInvoiced = fbl1n_entries.reduce((s, e) => s + Math.abs(e.amount), 0);
    const totalPaid = fbl1n_entries.filter(e => e.status === 'paid').reduce((s, e) => s + Math.abs(e.amount), 0);

    console.log(`\n  Total Facturado: S/ ${totalInvoiced.toFixed(2)}`);
    console.log(`  Total Pagado:    S/ ${totalPaid.toFixed(2)}`);
}

// Test OC 4100106433 (E001-68, Fazzio)
simulateForPO('4100106433', '1000060510', '12/25 CAS DE 1 A 15 E001-68');

// Test OC 4100106604 (E001-77, Fazzio)
simulateForPO('4100106604', '1000060510', '01/26 CAS DE 1 A 15 E001-77');

console.log('\n' + '='.repeat(60));
console.log('VERIFICATION COMPLETE');
