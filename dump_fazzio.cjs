const XLSX = require('xlsx');
const fs = require('fs');

const fblFile = 'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx';
const workbook = XLSX.readFile(fblFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const vendorCode = '1000060510';

console.log(`Dumping all rows for vendor ${vendorCode}:`);
data.forEach((row, idx) => {
    if (idx < 1) return;
    const rowVendor = String(row[1] || '').trim();
    if (rowVendor.includes(vendorCode)) {
        console.log(`Row ${idx + 1}:`, JSON.stringify(row));
    }
});
