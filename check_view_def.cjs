const sql = require('mssql');
require('dotenv').config();

async function checkView() {
    const pool = await sql.connect({
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER, database: process.env.DB_DATABASE,
        options: { encrypt: true, trustServerCertificate: true }
    });
    const r = await pool.request().query(`
        SELECT OBJECT_DEFINITION(OBJECT_ID('EBM.vw_EBM_Tracking')) AS def
    `);
    console.log(r.recordset[0]?.def);
    process.exit(0);
}
checkView().catch(e => { console.error(e); process.exit(1); });
