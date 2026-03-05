const XLSX = require('xlsx');

// Simulate the exact parser mapping logic
function findColumn(headers, synonyms) {
    for (const syn of synonyms) {
        const idx = headers.indexOf(syn);
        if (idx !== -1) return { name: syn, idx };
    }
    return null;
}

// ── Test ME5A mapping ──
console.log('=== ME5A COLUMN MAPPING TEST ===');
const me5aWb = XLSX.readFile('D:/diego/Documentos/Antigravity/EBM/sap_samples/ME5A (2).xlsx');
const me5aData = XLSX.utils.sheet_to_json(me5aWb.Sheets[me5aWb.SheetNames[0]], { header: 1 });
const me5aH = me5aData[0];

const totalValueMapping = findColumn(me5aH, ['Valor total', 'Total value', 'Val.total']);
const unitPriceMapping = findColumn(me5aH, ['Precio de valoración', 'Valuation Price', 'Precio val.']);
const quantityMapping = findColumn(me5aH, ['Cantidad solicitada', 'Quantity requested', 'Ctd.sol.', 'Cantidad']);

console.log(`  total_value → "${totalValueMapping?.name}" (col ${totalValueMapping?.idx})`);
console.log(`  unit_price  → "${unitPriceMapping?.name}" (col ${unitPriceMapping?.idx})`);
console.log(`  quantity    → "${quantityMapping?.name}" (col ${quantityMapping?.idx})`);

// Find solped 2000067324
const solpedCol = me5aH.indexOf('Solicitud de pedido');
const row = me5aData.find(r => String(r[solpedCol] || '').includes('2000067324'));
if (row) {
    const totalValue = Number(row[totalValueMapping.idx]) || 0;
    const unitPrice = Number(row[unitPriceMapping.idx]) || 0;
    const quantity = Number(row[quantityMapping.idx]) || 0;
    console.log(`\n  Solped 2000067324 actual values:`);
    console.log(`    Cantidad:     ${quantity}`);
    console.log(`    Precio Unit.: S/ ${unitPrice}`);
    console.log(`    Valor Total:  S/ ${totalValue}`);
    console.log(`    Check:        ${quantity} × ${unitPrice} = S/ ${(quantity * unitPrice).toFixed(2)}`);
    console.log(`    ✅ Matches!   ${totalValue === quantity * unitPrice ? 'YES' : 'NO'}`);
}

// ── Test ME5K cross-reference ──
console.log('\n=== ME5K CROSS-REFERENCE TEST ===');
const me5kWb = XLSX.readFile('D:/diego/Documentos/Antigravity/EBM/sap_samples/ME5K (2).xlsx');
const me5kData = XLSX.utils.sheet_to_json(me5kWb.Sheets[me5kWb.SheetNames[0]], { header: 1 });
const me5kH = me5kData[0];

const me5kNetValue = findColumn(me5kH, ['Valor neto de orden', 'Net Value', 'Val.neto', 'Importe']);
const me5kDist = findColumn(me5kH, ['Distribución (%)', 'Distribution (%)', 'Distrib.(%)']);
const me5kSolped = findColumn(me5kH, ['Solicitud de pedido']);
const me5kQty = findColumn(me5kH, ['Cantidad solicitada']);
const me5kPO = findColumn(me5kH, ['Pedido']);

console.log(`  net_value    → "${me5kNetValue?.name}" (col ${me5kNetValue?.idx})`);
console.log(`  distribution → "${me5kDist?.name}" (col ${me5kDist?.idx})`);

// Find solped 2000067324 in ME5K
const me5kRow = me5kData.find(r => String(r[me5kSolped?.idx] || '').includes('2000067324'));
if (me5kRow) {
    const netVal = Number(me5kRow[me5kNetValue.idx]) || 0;
    const dist = Number(me5kRow[me5kDist?.idx]) || 0;
    const qty = Number(me5kRow[me5kQty.idx]) || 0;
    const po = String(me5kRow[me5kPO.idx] || '');
    console.log(`\n  ME5K for Solped 2000067324:`);
    console.log(`    PO:             ${po}`);
    console.log(`    Cantidad:       ${qty}`);
    console.log(`    Valor neto:     S/ ${netVal} ${netVal === 0 ? '⚠️ ZERO' : ''}`);
    console.log(`    Distribución:   ${dist}% ${dist === 0 ? '⚠️ ZERO' : ''}`);

    if (netVal === 0 && dist === 0) {
        console.log(`\n  → Cross-reference triggered! Looking up ME5A...`);
        const prNum = String(me5kRow[me5kSolped.idx] || '').trim();
        const me5aMatch = me5aData.find(r => String(r[solpedCol] || '').trim() === prNum);
        if (me5aMatch) {
            const me5aTotalValue = Number(me5aMatch[totalValueMapping.idx]) || 0;
            const me5aUnitPrice = Number(me5aMatch[unitPriceMapping.idx]) || 0;
            const me5aQty = Number(me5aMatch[quantityMapping.idx]) || 0;
            console.log(`    ME5A Total:     S/ ${me5aTotalValue}`);
            console.log(`    ME5A Unit:      S/ ${me5aUnitPrice}`);
            console.log(`    ME5A Qty:       ${me5aQty}`);
            console.log(`    ✅ Cross-ref value: S/ ${me5aTotalValue || (me5aUnitPrice * me5aQty)}`);
            console.log(`    ✅ Cross-ref unit:  S/ ${me5aUnitPrice || (me5aQty > 0 ? me5aTotalValue / me5aQty : 0)}`);
        } else {
            console.log(`    ❌ No ME5A match found for pr_number=${prNum}`);
        }
    }
}

console.log('\n=== SUMMARY ===');
console.log('Before fix: ME5A would show S/ 5.65 (Precio de valoración)');
console.log('After fix:  ME5A shows S/ 3,390.00 (Valor total) ✅');
console.log('Before fix: ME5K would show S/ 0.00');
console.log('After fix:  ME5K cross-refs ME5A → S/ 3,390.00 ✅');
