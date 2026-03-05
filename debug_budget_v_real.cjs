
const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function inspect() {
    try {
        await sql.connect(config);

        console.log('--- MANAGEMENTS ---');
        const mgtResult = await sql.query(`SELECT Id, Name FROM EBM.Managements`);
        console.table(mgtResult.recordset);

        const atcId = mgtResult.recordset.find(m => m.Name.includes('Atención al Cliente'))?.Id;
        console.log('\nAtención al Cliente ID:', atcId);

        if (atcId) {
            console.log('\n--- BUDGETS (Count for ATC 2026) ---');
            const bCount = await sql.query(`SELECT COUNT(*) as count FROM EBM.Budgets WHERE ManagementId = '${atcId}' AND Year = 2026`);
            console.log('Count:', bCount.recordset[0].count);

            console.log('\n--- COST CENTERS for ATC ---');
            const cecos = await sql.query(`SELECT Code, Name FROM EBM.CostCenters WHERE ManagementId = '${atcId}'`);
            console.table(cecos.recordset);

            const codes = cecos.recordset.map(c => c.Code);
            if (codes.length > 0) {
                const cecoPlaceholders = codes.map(c => `'${c}'`).join(',');
                console.log('\n--- SAP ITEMS COUNT for ATC CeCos ---');
                const sapCount = await sql.query(`SELECT TransactionType, COUNT(*) as count FROM EBM.SAPLineItems WHERE CecoCode IN (${cecoPlaceholders}) GROUP BY TransactionType`);
                console.table(sapCount.recordset);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

inspect();
