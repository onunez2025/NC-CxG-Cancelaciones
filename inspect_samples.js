const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
    'D:/diego/Documentos/Antigravity/EBM/sap_samples/ME2K (2).xlsx',
    'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx',
    'D:/diego/Documentos/Antigravity/EBM/sap_samples/ME5K (2).xlsx',
    'D:/diego/Documentos/Antigravity/EBM/sap_samples/ME5A (2).xlsx',
    'D:/diego/Documentos/Antigravity/EBM/sap_samples/KSB1 (2).xlsx'
];

files.forEach(file => {
    if (!fs.existsSync(file)) {
        console.log(`File not found: ${file}`);
        return;
    }
    console.log(`--- Inspecting: ${path.basename(file)} ---`);
    try {
        const workbook = XLSX.readFile(file);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (data.length === 0) {
            console.log('Empty file');
            return;
        }

        // Find header row (simplified version of SapParserService logic)
        let headerIdx = 0;
        for (let i = 0; i < Math.min(20, data.length); i++) {
            if (data[i].some(cell => cell && String(cell).length > 2)) {
                headerIdx = i;
                break;
            }
        }

        console.log('Headers:', data[headerIdx]);
        console.log('Sample Row:', data[headerIdx + 1]);

        // Specifically look for the problematic OC in FBL1N (2)
        if (file.includes('FBL1N')) {
            console.log('Searching for OC 4100106604 in FBL1N...');
            const ocToFind = '4100106604';
            const matches = data.filter(row => row.some(cell => String(cell).includes(ocToFind)));
            console.log(`Found ${matches.length} matches for ${ocToFind}`);
            if (matches.length > 0) {
                console.log('First match:', matches[0]);
            }
        }
    } catch (err) {
        console.error(`Error reading ${file}:`, err.message);
    }
    console.log('\n');
});
