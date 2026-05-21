const sql = require('mssql');
require('dotenv').config();

async function checkSchema() {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            options: { encrypt: true, trustServerCertificate: true }
        });

        const res1 = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'GAC_APP_TB_CXG_NC'
        `);
        console.log("--- GAC_APP_TB_CXG_NC ---");
        console.table(res1.recordset);

        const res2 = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'GAC_APP_TB_HISTOTIAL_APROB_CXG_NC'
        `);
        console.log("--- GAC_APP_TB_HISTOTIAL_APROB_CXG_NC ---");
        console.table(res2.recordset);

        const res3 = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'GAC_APP_TB_CANCELACIONES'
        `);
        console.log("--- GAC_APP_TB_CANCELACIONES ---");
        console.table(res3.recordset);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSchema();
