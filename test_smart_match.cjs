const XLSX = require('xlsx');
const fs = require('fs');

const fblFile = 'D:/diego/Documentos/Antigravity/EBM/sap_samples/FBL1N (2).xlsx';
const me2kFile = 'D:/diego/Documentos/Antigravity/EBM/sap_samples/ME2K (2).xlsx';

const fblWb = XLSX.readFile(fblFile);
const fblData = XLSX.utils.sheet_to_json(fblWb.Sheets[fblWb.SheetNames[0]], { header: 1 });

const me2kWb = XLSX.readFile(me2kFile);
const me2kData = XLSX.utils.sheet_to_json(me2kWb.Sheets[me2kWb.SheetNames[0]], { header: 1 });

// Target PO: 4100106604
const targetPO = '4100106604';
const poRow = me2kData.find(row => row && String(row[1]).includes(targetPO));

if (poRow) {
    console.log(`PO: ${targetPO} Description: "${poRow[7]}"`);
} else {
    console.log(`PO ${targetPO} not found in ME2K (2)`);
}

console.log('\nFazzio rows in FBL1N (2) (Audit):');
fblData.forEach((row, idx) => {
    if (idx < 1) return;
    if (String(row[1]).includes('1000060510')) {
        console.log(`R${idx + 1}|R:${row[5]}|A:${row[6]}|T:${row[20]}`);
    }
});

// Function to try a "fuzzy/smart" match
function smartMatch(poDesc, fblRef, fblAsig) {
    const pattern = /([A-Z0-9]+)-([0-9]+)/g;
    let match;
    const fragments = [];
    while ((match = pattern.exec(poDesc)) !== null) {
        fragments.push({ series: match[1], number: match[2] });
    }

    if (fragments.length === 0) return false;

    const normalize = (s) => (s || '').replace(/^0+/, '').toUpperCase();

    for (const frag of fragments) {
        const normSeries = normalize(frag.series);
        const normNum = normalize(frag.number);

        const checkMatch = (str) => {
            if (!str) return false;
            const normStr = normalize(str);
            // Case 1: "0E001-0000000077" -> remove leading 0s and hyphens?
            // "0E001-0000000077" -> "E001-77" (after removing inner 0s after hyphen)
            const cleanStr = str.replace(/-0+/, '-').replace(/^0+/, '');
            if (cleanStr.includes(`${normSeries}-${normNum}`)) return true;
            return false;
        };

        if (checkMatch(fblRef) || checkMatch(fblAsig)) return true;
    }
    return false;
}

if (poRow) {
    const desc = poRow[7];
    console.log(`\nTesting smart match for "${desc}"...`);
    fblData.forEach((row, idx) => {
        if (idx < 1) return;
        if (String(row[1]).includes('1000060510')) {
            const isMatch = smartMatch(desc, row[5], row[6]);
            if (isMatch) {
                console.log(`SUCCESS! Match at R${idx + 1}|Doc:${row[3]}`);
            }
        }
    });
}
