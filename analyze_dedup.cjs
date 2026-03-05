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
    clearingDoc: H.indexOf('Doc.compensación'),
    postKey: H.indexOf('Clave contabiliz.'),
    glAccount: H.indexOf('Cuenta de mayor'),
    text: H.indexOf('Texto'),
    headerText: H.indexOf('Texto cab.documento'),
};

// ── Strategy: For invoices that have both XK (5xxxx) and 01 (8xxxx), keep only XK ──
// To validate: look at cases where XK and 01 docs share the same reference

console.log('=== CASES WHERE XK AND 01 SHARE SAME REFERENCE ===');

// Get all XK docs grouped by vendor+reference
const xkDocs = new Map(); // key: vendor+ref → doc details
const allDocs = new Map(); // key: vendor+ref → all docs

fblData.forEach((row, idx) => {
    if (idx === 0) return;
    const vendor = String(row[ci.vendor] || '').trim();
    const ref = String(row[ci.ref] || '').trim();
    const docType = String(row[ci.docType] || '').trim();
    const docNum = String(row[ci.docNum] || '').trim();
    if (!vendor || !ref) return;

    const key = `${vendor}|${ref}`;
    if (!allDocs.has(key)) allDocs.set(key, []);
    allDocs.get(key).push({ docNum, docType, amount: Number(row[ci.amountLocal]) || 0, idx: idx + 1 });
});

// Find refs that have BOTH XK and 01
let bothCount = 0;
allDocs.forEach((docs, key) => {
    const hasXK = docs.some(d => d.docType === 'XK');
    const has01 = docs.some(d => d.docType === '01');
    if (hasXK && has01) {
        bothCount++;
        if (bothCount <= 5) {
            const [vendor, ref] = key.split('|');
            console.log(`\n  Vendor: ${vendor}, Ref: ${ref}`);
            docs.forEach(d => console.log(`    ${d.docType} Doc:${d.docNum} Amt:${d.amount}`));
        }
    }
});
console.log(`\nTotal refs with BOTH XK and 01: ${bothCount}`);

// ── How many refs have ONLY 01 (no XK)? ──
let only01 = 0;
let onlyXK = 0;
allDocs.forEach((docs) => {
    const types = new Set(docs.map(d => d.docType));
    if (types.has('01') && !types.has('XK')) only01++;
    if (types.has('XK') && !types.has('01')) onlyXK++;
});
console.log(`\nRefs with ONLY 01 (no XK counterpart): ${only01}`);
console.log(`Refs with ONLY XK (no 01 counterpart): ${onlyXK}`);

// ── Verify: do 01 docs that DON'T have an XK counterpart represent standalone invoices? ──
console.log('\n=== SAMPLE: 01-only invoices (no XK) ===');
let samples = 0;
allDocs.forEach((docs, key) => {
    const types = new Set(docs.map(d => d.docType));
    if (types.has('01') && !types.has('XK') && samples < 5) {
        const [vendor, ref] = key.split('|');
        console.log(`\n  Vendor: ${vendor}, Ref: ${ref}`);
        docs.forEach(d => console.log(`    ${d.docType} Doc:${d.docNum} Amt:${d.amount}`));
        samples++;
    }
});

// ── Check: when XK and 01 coexist, are they always same absolute amount? ──
console.log('\n=== AMOUNT CONSISTENCY CHECK (XK vs 01) ===');
let consistent = 0, inconsistent = 0;
allDocs.forEach((docs, key) => {
    const xkAmts = docs.filter(d => d.docType === 'XK').reduce((s, d) => s + d.amount, 0);
    const oiAmts = docs.filter(d => d.docType === '01').reduce((s, d) => s + d.amount, 0);
    if (xkAmts !== 0 && oiAmts !== 0) {
        if (Math.abs(Math.abs(xkAmts) - Math.abs(oiAmts)) < 1) {
            consistent++;
        } else {
            inconsistent++;
            if (inconsistent <= 3) {
                const [vendor, ref] = key.split('|');
                console.log(`  Inconsistent: ${vendor}|${ref} XK=${xkAmts} vs 01=${oiAmts}`);
            }
        }
    }
});
console.log(`Consistent (XK ≈ 01): ${consistent}`);
console.log(`Inconsistent: ${inconsistent}`);

// ── Check for cases where there are multiple 01 docs for same ref (like 8000000636 + 8000001235) ──
console.log('\n=== MULTIPLE 01 DOCS FOR SAME REF ===');
let multipleOI = 0;
allDocs.forEach((docs, key) => {
    const oiDocs = docs.filter(d => d.docType === '01');
    const uniqueDocNums = new Set(oiDocs.map(d => d.docNum));
    if (uniqueDocNums.size > 1) {
        multipleOI++;
        if (multipleOI <= 3) {
            const [vendor, ref] = key.split('|');
            console.log(`\n  Vendor: ${vendor}, Ref: ${ref} — ${uniqueDocNums.size} different 01 docs`);
            oiDocs.forEach(d => console.log(`    Doc:${d.docNum} Amt:${d.amount}`));
        }
    }
});
console.log(`\nTotal refs with multiple 01 docs: ${multipleOI}`);
