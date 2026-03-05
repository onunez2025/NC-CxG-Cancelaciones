const XLSX = require('xlsx');
const fs = require('fs');

const fblFile = 'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx';
const workbook = XLSX.readFile(fblFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const vendorCode = '1000060510';
const targetAmount = 45955;

console.log(`Searching for vendor ${vendorCode} with amount near ${targetAmount}...`);

data.forEach((row, idx) => {
    if (idx < 1) return;
    const rowVendor = String(row[1] || '').trim();
    if (rowVendor.includes(vendorCode)) {
        const amount = Math.abs(Number(row[12]) || 0); // Column 12 is amount in loc curr
        if (Math.abs(amount - targetAmount) < 10) {
            console.log(`MATCH Row ${idx + 1}:`, JSON.stringify(row));
        }
    }
});
