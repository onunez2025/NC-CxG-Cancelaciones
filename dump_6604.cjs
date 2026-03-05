const XLSX = require('xlsx');
const fs = require('fs');

const fblFile = 'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx';
const workbook = XLSX.readFile(fblFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const matches = data.filter(row => row && JSON.stringify(row).includes('6604'));
console.log('Rows matching "6604":');
matches.forEach(m => console.log(JSON.stringify(m)));
