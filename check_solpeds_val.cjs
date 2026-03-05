
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

async function checkSolpeds() {
    try {
        await sql.connect(config);
        
        console.log('--- MUESTRA DE ME5K (Raw) ---');
        const me5k = await sql.query(`SELECT TOP 5 PrNumber, CostCenter, GlAccount, NetValue, Currency FROM EBM.SAP_ME5K WHERE NetValue > 0`);
        console.table(me5k.recordset);

        console.log('\n--- MUESTRA DE ME5A (Raw) ---');
        const me5a = await sql.query(`SELECT TOP 5 PrNumber, CostCenter, TotalValue, Currency FROM EBM.SAP_ME5A WHERE TotalValue > 0`);
        console.table(me5a.recordset);

        console.log('\n--- VISTA UNIFICADA (Solpeds de Servicio Técnico 639921000) ---');
        const unified = await sql.query(`
            SELECT TOP 10 TransactionType, pr_number, ceco, gl_account, val 
            FROM EBM.vw_SAPLineItemsUnified 
            WHERE (TransactionType = 'ME5K' OR TransactionType = 'ME5A')
              AND (gl_account = '639921000' OR gl_account IS NULL)
        `);
        console.table(unified.recordset);

    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

checkSolpeds();
