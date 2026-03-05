const XLSX = require('xlsx');

const fblWb = XLSX.readFile('D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx');
const fblData = XLSX.utils.sheet_to_json(fblWb.Sheets[fblWb.SheetNames[0]], { header: 1 });
const headers = fblData[0];

// The app uses sapParserService to map columns. Let's check what column it maps "vendor_id" to
// In SapParserService MAPPINGS.FBL1N: vendor_id maps to ['Proveedor', 'Vendor', 'Cuenta']
// Column 1 is "Proveedor" ← this is what the parser should use
// But there is NO column called "Cuenta" in FBL1N... wait. 
// Col 2 is "Cuenta de mayor" which is the GL account, not the vendor!

console.log('=== CHECKING VENDOR COLUMN MAPPING ===');
console.log(`Col 1: "${headers[1]}" (Proveedor)`);
console.log(`Col 2: "${headers[2]}" (Cuenta de mayor)`);

// Row 7686 vendor
const row7686 = fblData[7685];
console.log(`\nRow 7686 Proveedor (col 1): "${row7686[1]}"`);
console.log(`Row 7686 Cuenta de mayor (col 2): "${row7686[2]}"`);
console.log(`Row 7686 Doc.compras (col 22): "${row7686[22]}"`);

// Now check: does the SAP parser use 'Proveedor' or 'Cuenta'?
// The issue could be that row 7686 has NO "Documento compras" (col 22)
// So it needs to go through smartMatch, which we proved returns true.

// Let's check: is the FBL1N indexing by vendor correct?
// The app does: extractVendorCode(row.vendor_id)
// So vendor_id must = "1000060510" for Fazzio rows

// Count ALL Fazzio rows
let fazzioCount = 0;
let fazzioWithE001_68 = 0;
fblData.forEach((row, idx) => {
    if (idx === 0) return;
    const vendor = String(row[1] || '');
    if (vendor.includes('1000060510')) {
        fazzioCount++;
        const ref = String(row[5] || '');
        if (ref.includes('E001-68') || ref.includes('E1-68')) {
            fazzioWithE001_68++;
            console.log(`\nFazzio E001-68 match: Row ${idx + 1}`);
            console.log(`  Doc: ${row[3]}, Ref: "${row[5]}", Asig: "${row[6]}"`);
            console.log(`  DocType: "${row[4]}", Amount: ${row[12]}, Texto: "${row[20]}"`);
            console.log(`  Doc.compras: "${row[22]}"`);
        }
    }
});

console.log(`\nTotal Fazzio rows: ${fazzioCount}`);
console.log(`Fazzio rows matching E001-68: ${fazzioWithE001_68}`);

// Now check: what does the description "12/25 CAS DE 1 A 15 E001-68" contain?
// The regex extracts: "E001-68" → normalized "E001-68"
// But also "12/25" has a "/" not a "-", so only E001-68 is extracted
// Let's also check what "1 A 15" does... no dashes there, good.

// THE KEY QUESTION: does the app actually see this row?
// The app maps fbl1n by vendor_id. Let's see what vendor_id maps to.
// In sapParserService: vendor_id: ['Proveedor', 'Vendor', 'Cuenta']
// The header "Proveedor" exists at col 1 with value "1000060510"
// So extractVendorCode("1000060510") = "1000060510" ← correct

// CriticalCheck: in CrossReferenceService, extractVendorCode from ME2K:
// ME2K vendor field is: "1000060510 FAZZIO SERVICIOS INTEGRALES E.I.R.L"
// extractVendorCode takes first word → "1000060510" ← correct

// So the vendor codes should MATCH. Let's test the exact flow:
console.log('\n=== SIMULATING EXACT APP FLOW ===');

function extractVendorCode(vendorStr) {
    const trimmed = vendorStr.trim();
    const firstWord = trimmed.split(/\s+/)[0] || '';
    return firstWord.replace(/\D/g, '');
}

const me2kVendor = "1000060510 FAZZIO SERVICIOS INTEGRALES E.I.R.L";
const me2kVendorCode = extractVendorCode(me2kVendor);
console.log(`ME2K vendor code: "${me2kVendorCode}"`);

// FBL1N row vendor code
const fblVendorCode = extractVendorCode(String(row7686[1]));
console.log(`FBL1N row 7686 vendor code: "${fblVendorCode}"`);
console.log(`Match: ${me2kVendorCode === fblVendorCode}`);

// SO! If vendor codes match AND smartMatch returns true...
// The only remaining issue is whether the description from ME2K is 
// correctly passed to smartMatch.

// Let's check: what does crossReferenceService use as "first.description"?
// It uses: first.description where first = poRows[0] from ME2K
// In ME2K mapping: description maps to ['Texto breve', 'Short Text', 'Texto']
// From the ME2K row: col 7 = "Texto breve" = "12/25 CAS DE 1 A 15 E001-68"
console.log('\n=== CHECKING DESCRIPTION MAPPING ===');

// Let's check if there's a mapping issue. In SapParserService, ME2K maps:
// description: ['Texto breve', 'Short Text', 'Texto']
// Header col 7 in ME2K is "Texto breve" → should map to "description"
// Value: "12/25 CAS DE 1 A 15 E001-68"

// Wait! The value might be truncated. Let me check the actual ME2K data more carefully
const me2kWb = XLSX.readFile('D:/diego/Documentos/Antigravity/EBM/sap_samples/ME2K (2).xlsx');
const me2kData = XLSX.utils.sheet_to_json(me2kWb.Sheets[me2kWb.SheetNames[0]], { header: 1 });
const me2kHeaders = me2kData[0];

console.log('\nME2K Headers:');
me2kHeaders.forEach((h, i) => console.log(`  Col[${i}]: "${h}"`));

const me2kRow = me2kData.find(r => String(r[1]).includes('4100106433'));
if (me2kRow) {
    console.log(`\nME2K description (col7): "${me2kRow[7]}"`);
    console.log(`ME2K description type: ${typeof me2kRow[7]}`);
    console.log(`ME2K description length: ${String(me2kRow[7]).length}`);

    // Let's stringify and check for hidden chars
    const desc = String(me2kRow[7]);
    console.log(`ME2K description chars: ${[...desc].map(c => c.charCodeAt(0)).join(',')}`);
}
