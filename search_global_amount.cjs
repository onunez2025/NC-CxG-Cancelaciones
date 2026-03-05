const XLSX = require('xlsx');
const fs = require('fs');

const fblFile = 'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx';
const workbook = XLSX.readFile(fblFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const targetAmount = '45955';
console.log(`Global search for "${targetAmount}":`);

data.forEach((row, idx) => {
    if (row && JSON.stringify(row).includes(targetAmount)) {
        console.log(`Row ${idx + 1}:`, JSON.stringify(row));
    }
});
