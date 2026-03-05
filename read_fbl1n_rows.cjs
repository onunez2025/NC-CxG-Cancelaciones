const XLSX = require('xlsx');
const path = require('path');

const file = path.join(__dirname, 'sap_samples', 'FBL1N (5).xlsx');
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];

// Convert to array of arrays to see raw data
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Total rows:', data.length);
console.log('\n--- Headers (row 1) ---');
console.log(data[0]);

console.log('\n--- Row 3617 (index 3616) ---');
console.log(data[3616]);

console.log('\n--- Row 3618 (index 3617) ---');
console.log(data[3617]);

// Also search for any row mentioning E001-77 or FAZZIO
console.log('\n--- Rows mentioning E001-77 or 4100106604 ---');
data.forEach((row, idx) => {
    const str = JSON.stringify(row || '').toUpperCase();
    if (str.includes('E001-77') || str.includes('4100106604') || str.includes('FAZZIO')) {
        console.log(`Row ${idx + 1}:`, row);
    }
});
