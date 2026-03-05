const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
    'D:/diego/Documentos/Antigravity/EBM/sap_samples/ME2K (2).xlsx',
    'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx'
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

        let headerIdx = -1;
        for (let i = 0; i < Math.min(30, data.length); i++) {
            const row = data[i];
            if (row && row.some(cell => cell && String(cell).toUpperCase().includes('PEDIDO') || String(cell).toUpperCase().includes('DOCUMENTO'))) {
                headerIdx = i;
                break;
            }
        }

        if (headerIdx === -1) headerIdx = 0;

        console.log('Headers:', data[headerIdx]);

        // Find Release columns in ME2K
        if (file.includes('ME2K')) {
            const releaseStatusIdx = data[headerIdx].findIndex(h => String(h).includes('Estado de liberación'));
            const releaseStrategyIdx = data[headerIdx].findIndex(h => String(h).includes('Estrategia de liberación'));
            console.log(`Column Indices - Status: ${releaseStatusIdx}, Strategy: ${releaseStrategyIdx}`);
            if (releaseStatusIdx !== -1 || releaseStrategyIdx !== -1) {
                console.log('Sample data for release:');
                data.slice(headerIdx + 1, headerIdx + 10).forEach(row => {
                    console.log(`PO: ${row[0]}, Status: ${row[releaseStatusIdx]}, Strategy: ${row[releaseStrategyIdx]}`);
                });
            }
        }

        // Specifically look for the problematic OC in FBL1N (2)
        if (file.includes('FBL1N')) {
            const ocToFind = '4100106604';
            console.log(`Searching for OC ${ocToFind} in FBL1N...`);
            const matches = data.filter(row => row && row.some(cell => String(cell).includes(ocToFind)));
            console.log(`Found ${matches.length} matches for ${ocToFind}`);
            if (matches.length > 0) {
                matches.forEach((m, i) => console.log(`Match ${i + 1}:`, m));
            } else {
                // Check if vendor matches
                const vendorToFind = '1000060510'; // Fazzio from screenshot
                const vendorMatches = data.filter(row => row && row.some(cell => String(cell).includes(vendorToFind)));
                console.log(`Found ${vendorMatches.length} matches for Vendor ${vendorToFind}`);
                if (vendorMatches.length > 0) {
                    console.log('Sample for Vendor:', vendorMatches[0]);
                }
            }
        }
    } catch (err) {
        console.error(`Error reading ${file}:`, err.message);
    }
    console.log('\n');
});
