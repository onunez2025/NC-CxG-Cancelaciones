const sql = require('mssql');
require('dotenv').config();

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

async function checkViews() {
    try {
        const pool = await sql.connect(config);
        const solped = await pool.request().query('SELECT COUNT(*) as c FROM EBM.vw_EBM_Solped');
        const tracking = await pool.request().query('SELECT COUNT(*) as c FROM EBM.vw_EBM_Tracking');
        console.log(`Filas Solped VISTA: ${solped.recordset[0].c}`);
        console.log(`Filas Tracking VISTA: ${tracking.recordset[0].c}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkViews();
