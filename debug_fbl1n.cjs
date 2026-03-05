const XLSX = require('xlsx');
const fs = require('fs');

const fblFile = 'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx';
const targetOC = '4100106604';
const vendor = '1000060510';

const workbook = XLSX.readFile(fblFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log(`Searching for vendor ${vendor} rows...`);
data.forEach((row, idx) => {
    if (row && String(row[1]).includes(vendor)) {
        console.log(`Row ${idx + 1}:`, JSON.stringify(row));
    }
});

console.log(`\nSearching for fragments of ${targetOC}...`);
['4100106604', '106604', '6604'].forEach(frag => {
    const matches = data.filter(row => row && JSON.stringify(row).includes(frag));
    console.log(`Fragment "${frag}" found in ${matches.length} rows.`);
});
