
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

async function verify() {
    try {
        await sql.connect(config);

        console.log('--- BUSCANDO GERENCIA ATC ---');
        const mgtResult = await sql.query(`SELECT Id FROM EBM.Managements WHERE Name LIKE '%Atención al Cliente%'`);
        const atcId = mgtResult.recordset[0]?.Id;

        if (!atcId) {
            console.log('Gerencia no encontrada.');
            return;
        }

        console.log('Gerencia ID:', atcId);

        console.log('\n--- COST CENTERS CODES ---');
        const cecoResult = await sql.query(`SELECT Code FROM EBM.CostCenters WHERE ManagementId = '${atcId}'`);
        const codes = cecoResult.recordset.map(r => r.Code);
        console.log('Codes:', codes.join(', '));

        if (codes.length > 0) {
            const placeholders = codes.map(c => `'${c}'`).join(',');
            console.log('\n--- DATOS UNIFICADOS (Top 5) ---');
            const data = await sql.query(`SELECT TOP 5 TransactionType, ceco, gl_account, val, IsReal, IsOrdered, IsCommitted FROM EBM.vw_SAPLineItemsUnified WHERE ceco IN (${placeholders})`);
            console.table(data.recordset);

            console.log('\n--- TOTALES POR TIPO ---');
            const totals = await sql.query(`SELECT TransactionType, SUM(val) as total FROM EBM.vw_SAPLineItemsUnified WHERE ceco IN (${placeholders}) GROUP BY TransactionType`);
            console.table(totals.recordset);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

verify();
