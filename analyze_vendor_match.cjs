const XLSX = require('xlsx');
const path = require('path');

// Read ME2K
const me2k = XLSX.readFile(path.join(__dirname, 'sap_samples', 'ME2K (5).xlsx'));
const me2kData = XLSX.utils.sheet_to_json(me2k.Sheets[me2k.SheetNames[0]], { header: 1 });
console.log('=== ME2K Headers ===');
console.log(me2kData[0]);

// Find vendor column by searching headers
const me2kHeaders = me2kData[0].map(h => String(h).toLowerCase());
const vendorColIdx = me2kHeaders.findIndex(h => h.includes('proveedor') || h.includes('centro sum'));
console.log('Vendor column index:', vendorColIdx, '→', me2kData[0][vendorColIdx]);

// Show a few vendor values
console.log('\n=== ME2K Sample Vendor values (first 10 non-empty) ===');
let count = 0;
for (let i = 1; i < me2kData.length && count < 10; i++) {
    const v = me2kData[i]?.[vendorColIdx];
    if (v) { console.log(`  Row ${i + 1}: "${v}"`); count++; }
}

// Find row with BLACK PREMIUM
console.log('\n=== ME2K rows mentioning BLACK PREMIUM ===');
for (let i = 1; i < me2kData.length; i++) {
    const str = JSON.stringify(me2kData[i] || '').toUpperCase();
    if (str.includes('BLACK PREMIUM') || str.includes('4100106301')) {
        console.log(`  Row ${i + 1}:`, me2kData[i]);
    }
}

// Read FBL1N
const fbl1n = XLSX.readFile(path.join(__dirname, 'sap_samples', 'FBL1N (5).xlsx'));
const fbl1nData = XLSX.utils.sheet_to_json(fbl1n.Sheets[fbl1n.SheetNames[0]], { header: 1 });
console.log('\n=== FBL1N Headers ===');
console.log(fbl1nData[0]);

const fblHeaders = fbl1nData[0].map(h => String(h).toLowerCase());
const fblVendorIdx = fblHeaders.findIndex(h => h.includes('proveedor'));
console.log('FBL1N Vendor column index:', fblVendorIdx, '→', fbl1nData[0][fblVendorIdx]);

// Show sample vendor values
console.log('\n=== FBL1N Sample Vendor values (first 10 non-empty) ===');
count = 0;
for (let i = 1; i < fbl1nData.length && count < 10; i++) {
    const v = fbl1nData[i]?.[fblVendorIdx];
    if (v) { console.log(`  Row ${i + 1}: "${v}"`); count++; }
}

// Find TOURS SUR and BLACK PREMIUM rows mentioning E001-697
console.log('\n=== FBL1N rows containing E001-697 ===');
for (let i = 1; i < fbl1nData.length; i++) {
    const str = JSON.stringify(fbl1nData[i] || '').toUpperCase();
    if (str.includes('E001-697') || str.includes('E001-0000697') || str.includes('E001-0000000697')) {
        console.log(`  Row ${i + 1}: Vendor="${fbl1nData[i][fblVendorIdx]}", Ref="${fbl1nData[i][5]}", Assign="${fbl1nData[i][6]}"`);
    }
}
