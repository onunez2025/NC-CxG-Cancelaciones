// Verification script for normalizeRef and Smart Match
// Replicates exact logic from crossReferenceService.ts

function normalizeRef(s) {
    if (!s) return '';
    let norm = String(s).trim().toUpperCase();
    norm = norm.replace(/^0+(?=[A-Z])/i, '');
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

// ── Test normalizeRef ──
console.log('=== normalizeRef Tests ===');
const cases = [
    ['0E001-0000000068', 'E001-68'],
    ['0E001-68', 'E001-68'],
    ['E001-68', 'E001-68'],
    ['E1-68', 'E1-68'],
    ['0E001-0000000077', 'E001-77'],
    ['0E001-0000000072', 'E001-72'],
    ['0F001-0000167869', 'F001-167869'],
    ['XXXXX-0000343119', 'XXXXX-343119'],
    ['0E001-0000001403', 'E001-1403'],
    ['00004-0000015061', '4-15061'],       // Just numeric serie
    ['0E001-0000000064', 'E001-64'],
    ['', ''],
    ['TRANSFERENCIA', 'TRANSFERENCIA'],    // No dash → unchanged
];

let passed = 0, failed = 0;
cases.forEach(([input, expected]) => {
    const result = normalizeRef(input);
    const ok = result === expected;
    if (!ok) {
        console.log(`  ❌ normalizeRef("${input}") = "${result}" (expected "${expected}")`);
        failed++;
    } else {
        console.log(`  ✅ normalizeRef("${input}") = "${result}"`);
        passed++;
    }
});
console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

// ── Test Smart Match for OC 4100106433 ──
console.log('=== Smart Match Tests (OC 4100106433) ===');
const poDesc = "12/25 CAS DE 1 A 15 E001-68";

const fblRows = [
    { ref: '0E001-68', asig: 'E1-68', label: 'Row 7686 (short ref)' },
    { ref: '0E001-0000000068', asig: 'E1-68', label: 'Row 7695 (long ref)' },
    { ref: '0E001-0000000077', asig: '0E001-0000000077', label: 'E001-77 (different invoice)' },
    { ref: 'TRANSFERENCIA', asig: '', label: 'KZ payment (should NOT match)' },
];

fblRows.forEach(r => {
    const result = smartMatch(poDesc, r.ref, r.asig);
    const symbol = result ? '✅' : '❌';
    console.log(`  ${symbol} ${r.label}: smartMatch=${result} (ref="${r.ref}", asig="${r.asig}")`);
});

// ── Test Smart Match for OC 4100106604 ──
console.log('\n=== Smart Match Tests (OC 4100106604) ===');
const poDesc2 = "01/26 CAS DE 1 A 15 E001-77";
const fblRows2 = [
    { ref: '0E001-0000000077', asig: '0E001-0000000077', label: 'Row with E001-77' },
    { ref: '0E001-68', asig: 'E1-68', label: 'E001-68 (different invoice, should NOT match)' },
];

fblRows2.forEach(r => {
    const result = smartMatch(poDesc2, r.ref, r.asig);
    const symbol = result ? '✅' : '❌';
    console.log(`  ${symbol} ${r.label}: smartMatch=${result}`);
});

// ── Test doc type filtering ──
console.log('\n=== Document Type Filter Test ===');
const INVOICE_DOC_TYPES = new Set(['01', '02', '03', '05', '08', '14', '46', '50', '54', '99', 'XK']);
const testDocTypes = [
    ['01', true], ['XK', true], ['03', true],
    ['KZ', false], ['KK', false], ['SA', false], ['KS', false], ['TE', false],
    ['07', false], ['91', false], ['AB', false],
];

testDocTypes.forEach(([dt, expected]) => {
    const result = INVOICE_DOC_TYPES.has(dt);
    const ok = result === expected;
    const symbol = ok ? '✅' : '❌';
    console.log(`  ${symbol} ${dt}: ${result ? 'INCLUDE' : 'EXCLUDE'} (expected: ${expected ? 'INCLUDE' : 'EXCLUDE'})`);
});

// ── Full simulation with actual FBL1N data ──
console.log('\n=== Full Simulation: OC 4100106433 with real FBL1N data ===');
const XLSX = require('xlsx');
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
    text: H.indexOf('Texto'),
    clearingDoc: H.indexOf('Doc.compensación'),
};

// Get all Fazzio invoices
const fazzioRows = fblData.filter((r, i) => i > 0 && String(r[ci.vendor] || '').includes('1000060510'));
console.log(`Total Fazzio rows in FBL1N: ${fazzioRows.length}`);

// Apply doc type filter
const invoiceRows = fazzioRows.filter(r => {
    const dt = String(r[ci.docType] || '').trim();
    return !dt || INVOICE_DOC_TYPES.has(dt);
});
console.log(`After doc_type filter: ${invoiceRows.length}`);

// Apply smart match
const matchedRows = invoiceRows.filter(r => {
    return smartMatch(poDesc, String(r[ci.ref] || ''), String(r[ci.asig] || ''));
});
console.log(`After smart match: ${matchedRows.length}`);

// Group by document number
const grouped = new Map();
matchedRows.forEach(r => {
    const docNum = String(r[ci.docNum] || '');
    if (!grouped.has(docNum)) grouped.set(docNum, []);
    grouped.get(docNum).push(r);
});

console.log(`Grouped into ${grouped.size} document(s):`);
grouped.forEach((lines, docNum) => {
    const totalAmt = lines.reduce((s, l) => s + (Number(l[ci.amountLocal]) || 0), 0);
    const docType = lines[0][ci.docType];
    const ref = lines[0][ci.ref];
    const anyCleared = lines.some(l => l[ci.clearingDoc]);
    console.log(`  Doc ${docNum} [${docType}] ref="${ref}": ${lines.length} lines, total=${totalAmt.toFixed(2)}, cleared=${anyCleared}`);
});
