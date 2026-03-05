const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const sampleDir = path.join(__dirname, 'sap_samples');
const filesToRead = [
    'FBL1N (4).xlsx',
    'ME2K (4).xlsx',
    'ME5A (4).xlsx',
    'ME5K (4).xlsx',
    'KSB1 (4).xlsx'
];

function readHeadersAndSample(filename) {
    const filePath = path.join(sampleDir, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filename}`);
        return;
    }
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Convert to json, just first 5 rows
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- ${filename} ---`);
        if (data.length > 0) {
            console.log('Headers:', data[0]);
        }
        // Also we want to find specific columns and show 3 non-empty values
        const headers = data[0] || [];
        const targetCols = ['Referencia', 'Asignación', 'Texto breve', 'Documento compras', 'Solicitud de pedido', 'Pedido', 'Centro de coste', 'Ce.coste'];

        // Convert array of arrays to objects
        const jsonData = xlsx.utils.sheet_to_json(sheet);
        for (const col of targetCols) {
            if (headers.includes(col)) {
                const samples = jsonData
                    .map(row => row[col])
                    .filter(val => val !== undefined && val !== null && val !== '')
                    .slice(0, 5);
                console.log(`Column '${col}' samples:`, samples);
            }
        }

    } catch (error) {
        console.error(`Error reading ${filename}: ${error.message}`);
    }
}

filesToRead.forEach(readHeadersAndSample);
