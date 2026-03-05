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

async function check() {
    try {
        const pool = await sql.connect(config);

        console.log("--- vw_EBM_Solped ---");
        const res1 = await pool.request().query("SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID('EBM.vw_EBM_Solped')");
        if (res1.recordset[0]) console.log(res1.recordset[0].definition);

        console.log("\n--- vw_EBM_Tracking ---");
        const res2 = await pool.request().query("SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID('EBM.vw_EBM_Tracking')");
        if (res2.recordset[0]) console.log(res2.recordset[0].definition);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
