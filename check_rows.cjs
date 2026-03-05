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

async function checkRows() {
    try {
        const pool = await sql.connect(config);
        const me2k = await pool.request().query('SELECT COUNT(*) as c FROM EBM.SAP_ME2K');
        const me5k = await pool.request().query('SELECT COUNT(*) as c FROM EBM.SAP_ME5K');
        const fbl1n = await pool.request().query('SELECT COUNT(*) as c FROM EBM.SAP_FBL1N');
        console.log(`Filas ME2K: ${me2k.recordset[0].c}`);
        console.log(`Filas ME5K: ${me5k.recordset[0].c}`);
        console.log(`Filas FBL1N: ${fbl1n.recordset[0].c}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkRows();
