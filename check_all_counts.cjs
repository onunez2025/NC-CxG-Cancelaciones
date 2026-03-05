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

async function checkAll() {
    try {
        const pool = await sql.connect(config);
        console.log("Connected to:", process.env.DB_SERVER, "/", process.env.DB_DATABASE);

        const res = await pool.request().query("SELECT SCHEMA_NAME(schema_id) AS sch, name, (SELECT SUM(row_count) FROM sys.dm_db_partition_stats WHERE object_id = t.object_id AND index_id < 2) AS rows FROM sys.tables t WHERE name LIKE '%SAP%'");
        console.log(JSON.stringify(res.recordset, null, 2));

        const resV = await pool.request().query("SELECT SCHEMA_NAME(schema_id) AS sch, name FROM sys.views WHERE name LIKE '%EBM%'");
        console.log("Views:", JSON.stringify(resV.recordset, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkAll();
