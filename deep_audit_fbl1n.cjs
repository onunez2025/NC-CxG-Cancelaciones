const XLSX = require('xlsx');

const fblWb = XLSX.readFile('D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx');
const fblData = XLSX.utils.sheet_to_json(fblWb.Sheets[fblWb.SheetNames[0]], { header: 1 });
const H = fblData[0];

// Column indices
const cols = {
    vendor: H.indexOf('Proveedor'),
    glAccount: H.indexOf('Cuenta de mayor'),
    docNum: H.indexOf('Nº documento'),
    docType: H.indexOf('Clase de documento'),
    ref: H.indexOf('Referencia'),
    asig: H.indexOf('Asignación'),
    postDate: H.indexOf('Fecha contabiliz.'),
    amountLocal: H.indexOf('Importe en moneda local'),
    currency: H.indexOf('Moneda local'),
    clearingDoc: H.indexOf('Doc.compensación'),
    headerText: H.indexOf('Texto cab.documento'),
    text: H.indexOf('Texto'),
    poNumber: H.indexOf('Documento compras'),
};

console.log('Column indices:', cols);

// ── 1. Show ALL Fazzio rows 7680-7700 ──
console.log('\n=== ALL FAZZIO ROWS 7680-7700 ===');
for (let idx = 7679; idx < 7700 && idx < fblData.length; idx++) {
    const row = fblData[idx];
    const vendor = String(row[cols.vendor] || '');
    if (vendor.includes('1000060510')) {
        console.log(`Row ${idx + 1}: Doc=${row[cols.docNum]} | Type=${row[cols.docType]} | Ref="${row[cols.ref]}" | Asig="${row[cols.asig]}" | Amt=${row[cols.amountLocal]} | Text="${row[cols.text]}" | PO="${row[cols.poNumber]}" | Clear="${row[cols.clearingDoc]}"`);
    }
}

// ── 2. Full audit: how reference patterns look across ALL vendors ──
console.log('\n=== REFERENCE PATTERN ANALYSIS ===');
const refPatterns = { hasRef: 0, emptyRef: 0, refWithZeroPrefix: 0, refWithDash: 0, refNumericOnly: 0 };
const docTypesByInvoicePattern = {};

fblData.forEach((row, idx) => {
    if (idx === 0) return;
    const ref = String(row[cols.ref] || '').trim();
    const docType = String(row[cols.docType] || '').trim();

    if (ref) {
        refPatterns.hasRef++;
        if (ref.startsWith('0')) refPatterns.refWithZeroPrefix++;
        if (ref.includes('-')) refPatterns.refWithDash++;
        if (/^\d+$/.test(ref)) refPatterns.refNumericOnly++;
    } else {
        refPatterns.emptyRef++;
    }

    // Track which doc types have reference with dash patterns (invoice-like)
    if (ref.includes('-') && /[A-Z]/i.test(ref)) {
        if (!docTypesByInvoicePattern[docType]) docTypesByInvoicePattern[docType] = 0;
        docTypesByInvoicePattern[docType]++;
    }
});

console.log('Reference patterns:', refPatterns);
console.log('\nDoc types having invoice-like references (letter+dash+number):');
Object.entries(docTypesByInvoicePattern)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => console.log(`  ${type}: ${count}`));

// ── 3. For each doc type, show what kind of data they contain ──
console.log('\n=== DOCUMENT TYPE DEEP ANALYSIS ===');
const docTypes = {};
fblData.forEach((row, idx) => {
    if (idx === 0) return;
    const dt = String(row[cols.docType] || '').trim();
    if (!docTypes[dt]) docTypes[dt] = { count: 0, positiveAmts: 0, negativeAmts: 0, withPO: 0, withClearing: 0, sampleRefs: [] };
    docTypes[dt].count++;
    const amt = Number(row[cols.amountLocal]) || 0;
    if (amt > 0) docTypes[dt].positiveAmts++;
    else docTypes[dt].negativeAmts++;
    if (String(row[cols.poNumber] || '').trim()) docTypes[dt].withPO++;
    if (String(row[cols.clearingDoc] || '').trim()) docTypes[dt].withClearing++;
    if (docTypes[dt].sampleRefs.length < 3) {
        const ref = String(row[cols.ref] || '').trim();
        if (ref) docTypes[dt].sampleRefs.push(ref);
    }
});

Object.entries(docTypes)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([type, info]) => {
        console.log(`\n  ${type} (${info.count} rows):`);
        console.log(`    Positive amounts: ${info.positiveAmts} | Negative: ${info.negativeAmts}`);
        console.log(`    With PO number: ${info.withPO} | With clearing doc: ${info.withClearing}`);
        console.log(`    Sample refs: ${info.sampleRefs.join(', ')}`);
    });

// ── 4. For OC 4100106433, show ALL possible matches across ALL strategies ──
console.log('\n=== ALL POSSIBLE MATCHES FOR E001-68 (ANY VENDOR) ===');
fblData.forEach((row, idx) => {
    if (idx === 0) return;
    const ref = String(row[cols.ref] || '');
    const asig = String(row[cols.asig] || '');
    const text = String(row[cols.text] || '');
    const headerText = String(row[cols.headerText] || '');

    const allText = `${ref}|${asig}|${text}|${headerText}`;
    if (allText.toUpperCase().includes('E001-68') || allText.toUpperCase().includes('E1-68')) {
        console.log(`Row ${idx + 1}: Vendor=${row[cols.vendor]} | Doc=${row[cols.docNum]} | Type=${row[cols.docType]} | Ref="${ref}" | Asig="${asig}" | Amt=${row[cols.amountLocal]} | Text="${text}" | PO="${row[cols.poNumber]}"`);
    }
});
