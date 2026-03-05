const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
    'D:/diego/Documentos/Antigravity/EBM/sap_samples/ME2K (2).xlsx',
    'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx'
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    console.log(`--- Inspecting: ${path.basename(file)} ---`);
    const workbook = XLSX.readFile(file);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let headerIdx = -1;
    for (let i = 0; i < Math.min(30, data.length); i++) {
        const row = data[i];
        if (row && row.some(cell => cell && String(cell).toUpperCase().includes('PEDIDO') || String(cell).toUpperCase().includes('DOCUMENTO'))) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) headerIdx = 0;
    const headers = data[headerIdx];

    if (file.includes('ME2K')) {
        const hStatus = headers.findIndex(h => String(h).includes('Estado liberación'));
        const hStrategy = headers.findIndex(h => String(h).includes('Estrategia liberac.'));
        console.log(`Release Headers indices: Status=${hStatus}, Strategy=${hStrategy}`);
        if (hStatus !== -1 || hStrategy !== -1) {
            console.log('Sample release data:');
            data.slice(headerIdx + 1, headerIdx + 10).forEach(row => {
                console.log(`PO: ${row[1]}, Status: ${row[hStatus]}, Strat: ${row[hStrategy]}`);
            });
        }
    }

    if (file.includes('FBL1N')) {
        const ocToFind = '4100106604';
        const docComprasIdx = headers.findIndex(h => String(h).includes('Documento compras'));
        const asignacionIdx = headers.findIndex(h => String(h).includes('Asignación'));
        const textoIdx = headers.findIndex(h => String(h).includes('Texto'));

        console.log(`FBL1N search indices: DocCompras=${docComprasIdx}, Asignacion=${asignacionIdx}, Texto=${textoIdx}`);

        // Search in ALL columns for the OC
        const matches = [];
        data.forEach((row, idx) => {
            if (idx <= headerIdx) return;
            if (row && row.some(cell => cell && String(cell).includes(ocToFind))) {
                matches.push(row);
            }
        });

        console.log(`Total rows with ${ocToFind}: ${matches.length}`);
        if (matches.length > 0) {
            console.log('Full row data for missing invoice:');
            matches.forEach(m => console.log(JSON.stringify(m)));
        } else {
            console.log('No exact match. Searching for suffix 106604...');
            const suffixMatches = data.filter(row => row && row.some(cell => cell && String(cell).includes('106604')));
            console.log(`Suffix matches: ${suffixMatches.length}`);
            if (suffixMatches.length > 0) console.log(JSON.stringify(suffixMatches[0]));
        }
    }
    console.log('\n');
});
