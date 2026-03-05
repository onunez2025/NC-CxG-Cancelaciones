const XLSX = require('xlsx');
const fs = require('fs');

const fblFile = 'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx';
const workbook = XLSX.readFile(fblFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const targetVendor = '1000060510';
console.log('Compact Audit for Fazzio (1000060510):');

data.forEach((row, idx) => {
    if (idx < 1) return;
    if (String(row[1]).includes(targetVendor)) {
        // DocNum (3), Amount (12), Currency (13), Text (20), Assignment (6)
        console.log(`R${idx + 1}|Doc:${row[3]}|Amt:${row[12]}|Txt:${row[20]}|Asig:${row[6]}`);
    }
});
