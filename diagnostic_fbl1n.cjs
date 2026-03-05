const XLSX = require('xlsx');
const fs = require('fs');

const fblFile = 'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx';

if (!fs.existsSync(fblFile)) {
    console.log('File not found');
    process.exit(1);
}

const workbook = XLSX.readFile(fblFile);
console.log('Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Searching in Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Vendor for OC 4100106604 is 1000060510 (FAZZIO)
    const vendorCode = '1000060510';
    const ocFragment = '106604';

    data.forEach((row, idx) => {
        const rowStr = JSON.stringify(row);
        const containsVendor = rowStr.includes(vendorCode);
        const containsOC = rowStr.includes(ocFragment);

        if (containsVendor || containsOC) {
            console.log(`Match at row ${idx + 1} (Vendor:${containsVendor}, OC:${containsOC}):`, rowStr);
        }
    });
});
