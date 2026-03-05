import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { getDbConnection } from './server/db.js';

async function analyze() {
    try {
        console.log("Reading Excel file...");
        const fileData = fs.readFileSync('d:/diego/Documentos/Antigravity/EBM/sap_samples/Presupuesto 2026.xlsx');
        const workbook = XLSX.read(fileData, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        let excelTotal = 0;
        let cecoRows = 0;
        const excelAccounts = new Set();
        const excelAccountTotals: Record<string, number> = {};

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const ceco = String(row[0] || '').trim();
            if (ceco === 'MT050004') {
                cecoRows++;
                excelAccounts.add(String(row[1] || '').trim());

                let rowTotal = 0;
                for (let m = 3; m <= 14; m++) {
                    const val = row[m];
                    if (val !== '-' && val !== null && val !== undefined && val !== '') {
                        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
                        rowTotal += isNaN(num) ? 0 : num;
                    }
                }
                const accountCode = String(row[1] || '').trim();
                excelAccountTotals[accountCode] = (excelAccountTotals[accountCode] || 0) + rowTotal;
                excelTotal += rowTotal;
            }
        }

        console.log(`Excel analysis for MT050004:`);
        console.log(`- Rows: ${cecoRows}`);
        console.log(`- Unique Accounts: ${excelAccounts.size}`);
        console.log(`- Total Sum: ${excelTotal}`);

        console.log("\nConnecting to DB...");
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT 
                b.Id, b.Year, a.Code as AccountCode, b.Total, c.Code as CecoCode
            FROM EBM.Budgets b
            JOIN EBM.AccountingAccounts a ON b.AccountId = a.Id
            JOIN EBM.CostCenters c ON b.CostCenterId = c.Id
            WHERE c.Code = 'MT050004' AND b.Year = 2026
        `);

        let dbTotal = 0;
        console.log(`\nDB verification for MT050004 (2026):`);
        console.log(`- Records found: ${result.recordset.length}`);

        for (const row of result.recordset) {
            dbTotal += Number(row.Total);
            const accountCode = row.AccountCode;
            const excelAccTotal = excelAccountTotals[accountCode];
            if (Math.abs(Number(row.Total) - excelAccTotal) > 0.01) {
                console.log(`MISMATCH for account ${accountCode}: DB = ${Number(row.Total)}, EXCEL = ${excelAccTotal}`);
            }
        }
        console.log(`- DB Total Sum: ${dbTotal}`);

        if (dbTotal !== excelTotal) {
            // Check for duplicate accounts in DB
            const dbAccounts = result.recordset.map(r => r.AccountCode);
            const duplicates = dbAccounts.filter((item, index) => dbAccounts.indexOf(item) !== index);
            if (duplicates.length > 0) {
                console.log(`- WARNING: Found duplicate accounts in DB for this CECO: ${duplicates.join(', ')}`);
            }

            // Check if any DB account is not in Excel
            const dbOnly = dbAccounts.filter(a => !excelAccounts.has(a));
            if (dbOnly.length > 0) {
                console.log(`- Accounts in DB but NOT in Excel: ${dbOnly.join(', ')}`);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

analyze();
