const XLSX = require('xlsx');

// ── 1. Read FBL1N (2) row 7686 ──
const fblWb = XLSX.readFile('D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx');
const fblSheet = fblWb.Sheets[fblWb.SheetNames[0]];
const fblData = XLSX.utils.sheet_to_json(fblSheet, { header: 1 });

// Show headers
console.log('=== FBL1N HEADERS ===');
const headers = fblData[0];
headers.forEach((h, i) => console.log(`  Col[${i}]: "${h}"`));

// Show row 7686 (1-indexed in Excel = index 7685 in 0-indexed array)
console.log('\n=== ROW 7686 (target) ===');
const targetRow = fblData[7685];
if (targetRow) {
    headers.forEach((h, i) => {
        if (targetRow[i] !== undefined && targetRow[i] !== '') {
            console.log(`  ${h} [${i}]: "${targetRow[i]}"`);
        }
    });
} else {
    console.log('Row 7686 not found!');
}

// ── 2. Read ME2K for OC 4100106433 ──
const me2kWb = XLSX.readFile('D:/diego/Documentos/Antigravity/EBM/sap_samples/ME2K (2).xlsx');
const me2kData = XLSX.utils.sheet_to_json(me2kWb.Sheets[me2kWb.SheetNames[0]], { header: 1 });
const me2kHeaders = me2kData[0];

console.log('\n=== ME2K row for OC 4100106433 ===');
const me2kRow = me2kData.find(r => String(r[1]).includes('4100106433'));
if (me2kRow) {
    me2kHeaders.forEach((h, i) => {
        if (me2kRow[i] !== undefined && me2kRow[i] !== '') {
            console.log(`  ${h} [${i}]: "${me2kRow[i]}"`);
        }
    });
} else {
    console.log('OC 4100106433 not found in ME2K!');
}

// ── 3. Now simulate the smartMatch logic ──
function normalizeRef(s) {
    if (!s) return '';
    return String(s)
        .replace(/-0+/, '-')
        .replace(/^0+/, '')
        .trim()
        .toUpperCase();
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

// Get description from ME2K
const poDesc = me2kRow ? String(me2kRow[7] || '') : '';
console.log('\n=== SMART MATCH DEBUG ===');
console.log(`PO Description: "${poDesc}"`);

// Extract fragments
const pattern = /([A-Z0-9]+)-([0-9]+)/g;
let m;
while ((m = pattern.exec(poDesc.toUpperCase())) !== null) {
    const normS = normalizeRef(m[1]);
    const normN = normalizeRef(m[2]);
    console.log(`  Fragment found: "${m[0]}" → normalized: "${normS}-${normN}"`);
}

// Now check row 7686
if (targetRow) {
    // Find Referencia column index
    const refIdx = headers.indexOf('Referencia');
    const asigIdx = headers.indexOf('Asignación');
    const vendorIdx = headers.indexOf('Cuenta');
    const docTypeIdx = headers.indexOf('Clase de documento');

    console.log(`\n  Referencia col index: ${refIdx}`);
    console.log(`  Asignación col index: ${asigIdx}`);
    console.log(`  Vendor (Cuenta) col index: ${vendorIdx}`);

    const fblRef = String(targetRow[refIdx] || '');
    const fblAsig = String(targetRow[asigIdx] || '');
    const fblVendor = String(targetRow[vendorIdx] || '');

    console.log(`\n  Row 7686 Referencia: "${fblRef}" → normalized: "${normalizeRef(fblRef)}"`);
    console.log(`  Row 7686 Asignación: "${fblAsig}" → normalized: "${normalizeRef(fblAsig)}"`);
    console.log(`  Row 7686 Vendor: "${fblVendor}"`);

    const result = smartMatch(poDesc, fblRef, fblAsig);
    console.log(`\n  smartMatch result: ${result}`);

    // Also check: does the vendor code match?
    console.log(`\n  ME2K vendor raw: "${me2kRow ? me2kRow[3] : 'N/A'}"`);
}

// ── 4. Analyze "Clase de documento" column ──
console.log('\n=== CLASE DE DOCUMENTO ANALYSIS ===');
const docTypeIdx = headers.indexOf('Clase de documento');
console.log(`Column index: ${docTypeIdx}`);

if (docTypeIdx >= 0) {
    const counts = {};
    fblData.forEach((row, idx) => {
        if (idx === 0) return;
        const val = String(row[docTypeIdx] || '').trim();
        if (val) counts[val] = (counts[val] || 0) + 1;
    });

    console.log('\nDocument type distribution:');
    Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            console.log(`  ${type}: ${count} rows`);
        });
}

// ── 5. Show all Fazzio rows near 7686 with their Referencia ──
console.log('\n=== FAZZIO ROWS WITH REFERENCIA (near 7686) ===');
const refIdx = headers.indexOf('Referencia');
const asigIdx2 = headers.indexOf('Asignación');
const vendorIdx2 = headers.indexOf('Cuenta');
const docTypeIdx2 = headers.indexOf('Clase de documento');
const amountIdx = headers.findIndex(h => String(h).includes('ML'));

fblData.forEach((row, idx) => {
    if (idx === 0) return;
    const vendor = String(row[vendorIdx2] || '');
    if (vendor.includes('1000060510') && idx >= 7680 && idx <= 7700) {
        console.log(`  R${idx + 1}: Ref="${row[refIdx]}" Asig="${row[asigIdx2]}" DocType="${row[docTypeIdx2]}" Amount="${row[amountIdx]}"`);
    }
});
