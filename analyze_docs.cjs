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
    text: H.indexOf('Texto'),
    glAccount: H.indexOf('Cuenta de mayor'),
    headerText: H.indexOf('Texto cab.documento'),
};

// ── 1. All 6 rows for E001-68 Fazzio ──
console.log('=== ALL E001-68 FAZZIO ROWS (detailed) ===');
fblData.forEach((row, idx) => {
    if (idx === 0) return;
    const vendor = String(row[ci.vendor] || '');
    const ref = String(row[ci.ref] || '');
    const asig = String(row[ci.asig] || '');
    if (vendor.includes('1000060510') && (ref.includes('E001-68') || ref.includes('E001-0000000068') || asig.includes('E1-68'))) {
        console.log(`\nRow ${idx + 1}:`);
        console.log(`  Nº documento:    ${row[ci.docNum]}`);
        console.log(`  Clase documento:  ${row[ci.docType]}`);
        console.log(`  Clave contab.:    ${row[ci.postKey]}`);
        console.log(`  Cuenta mayor:     ${row[ci.glAccount]}`);
        console.log(`  Referencia:       ${row[ci.ref]}`);
        console.log(`  Asignación:       ${row[ci.asig]}`);
        console.log(`  MONTO:            ${row[ci.amountLocal]}`);
        console.log(`  Doc.compensación: ${row[ci.clearingDoc]}`);
        console.log(`  Texto cab.:       ${row[ci.headerText]}`);
        console.log(`  Texto:            ${row[ci.text]}`);
    }
});

// ── 2. Analyze document number prefixes ──
console.log('\n\n=== DOCUMENT NUMBER PREFIX ANALYSIS ===');
const prefixCounts = {};
const prefixDocTypes = {};
fblData.forEach((row, idx) => {
    if (idx === 0) return;
    const docNum = String(row[ci.docNum] || '').trim();
    if (!docNum) return;
    const prefix = docNum[0]; // first digit
    if (!prefixCounts[prefix]) { prefixCounts[prefix] = 0; prefixDocTypes[prefix] = {}; }
    prefixCounts[prefix]++;
    const dt = String(row[ci.docType] || '').trim();
    if (!prefixDocTypes[prefix][dt]) prefixDocTypes[prefix][dt] = 0;
    prefixDocTypes[prefix][dt]++;
});

Object.entries(prefixCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([prefix, count]) => {
        console.log(`\nPrefix "${prefix}xxxxx..." → ${count} rows`);
        console.log('  Document types:');
        Object.entries(prefixDocTypes[prefix])
            .sort((a, b) => b[1] - a[1])
            .forEach(([dt, c]) => console.log(`    ${dt}: ${c}`));
    });

// ── 3. Clave contabilización analysis ──  
console.log('\n\n=== CLAVE CONTABILIZACIÓN (Posting Key) ANALYSIS ===');
const postKeyCounts = {};
fblData.forEach((row, idx) => {
    if (idx === 0) return;
    const pk = String(row[ci.postKey] || '').trim();
    const amt = Number(row[ci.amountLocal]) || 0;
    if (!postKeyCounts[pk]) postKeyCounts[pk] = { count: 0, positive: 0, negative: 0 };
    postKeyCounts[pk].count++;
    if (amt > 0) postKeyCounts[pk].positive++;
    else postKeyCounts[pk].negative++;
});

Object.entries(postKeyCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([pk, info]) => {
        console.log(`  Key ${pk}: ${info.count} rows (${info.positive} positive, ${info.negative} negative)`);
    });

// ── 4. GL Accounts for E001-68 ──
console.log('\n\n=== GL ACCOUNTS (Cuenta de mayor) for E001-68 ===');
console.log('421211000 = Cuentas por pagar comerciales (pasivo)');
console.log('421211001 = ¿Detracciones? (pasivo)');
console.log('Docs starting with 5 = Verif. de facturas logísticas');
console.log('Docs starting with 8 = MIRO - Facturas contables');
