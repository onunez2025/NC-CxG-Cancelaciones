const XLSX = require('xlsx');

// ── Analyze ME5A columns ──
console.log('=== ME5A (2) Column Analysis ===');
const me5aWb = XLSX.readFile('D:/diego/Documentos/Antigravity/EBM/sap_samples/ME5A (2).xlsx');
const me5aData = XLSX.utils.sheet_to_json(me5aWb.Sheets[me5aWb.SheetNames[0]], { header: 1 });
const me5aH = me5aData[0];
console.log('All columns:', me5aH.join(' | '));

// Find the row for solped 2000067324
console.log('\n=== Row for Solped 2000067324 ===');
const solpedCol = me5aH.indexOf('Solicitud de pedido');
const qtyCol = me5aH.indexOf('Cantidad solicitada');
const priceCol = me5aH.indexOf('Precio de valoración');
const totalCol = me5aH.indexOf('Valor total');
const descCol = me5aH.indexOf('Texto breve');

console.log(`Column indices: Solped=${solpedCol}, Qty=${qtyCol}, Price=${priceCol}, Total=${totalCol}, Desc=${descCol}`);

me5aData.forEach((row, idx) => {
    if (String(row[solpedCol] || '').includes('2000067324')) {
        console.log(`\nRow ${idx + 1}:`);
        me5aH.forEach((col, ci) => {
            if (row[ci] !== undefined && row[ci] !== null && row[ci] !== '') {
                console.log(`  ${col}: ${row[ci]}`);
            }
        });
    }
});

// ── Analyze ME5K columns ──
console.log('\n\n=== ME5K (2) Column Analysis ===');
const me5kWb = XLSX.readFile('D:/diego/Documentos/Antigravity/EBM/sap_samples/ME5K (2).xlsx');
const me5kData = XLSX.utils.sheet_to_json(me5kWb.Sheets[me5kWb.SheetNames[0]], { header: 1 });
const me5kH = me5kData[0];
console.log('All columns:', me5kH.join(' | '));

// Find the row for solped 2000067324 in ME5K
console.log('\n=== Row for Solped 2000067324 in ME5K ===');
const me5kSolpedCol = me5kH.indexOf('Solicitud de pedido');
const me5kValueCol = me5kH.indexOf('Valor neto de orden');
const me5kDistCol = me5kH.indexOf('Distribución (%)');
const me5kQtyCol = me5kH.indexOf('Cantidad solicitada');

console.log(`Column indices: Solped=${me5kSolpedCol}, Value=${me5kValueCol}, Dist=${me5kDistCol}, Qty=${me5kQtyCol}`);

me5kData.forEach((row, idx) => {
    if (String(row[me5kSolpedCol] || '').includes('2000067324')) {
        console.log(`\nRow ${idx + 1}:`);
        me5kH.forEach((col, ci) => {
            if (row[ci] !== undefined && row[ci] !== null && row[ci] !== '') {
                console.log(`  ${col}: ${row[ci]}`);
            }
        });
    }
});
