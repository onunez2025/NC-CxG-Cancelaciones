
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    server: process.env.DB_SERVER || '',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function findTable() {
    try {
        const pool = await sql.connect(sqlConfig);
        const result = await pool.request().query("SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Dashboard_FSM'");
        console.log(JSON.stringify(result.recordset, null, 2));
        await pool.close();
    } catch (err) {
        console.error(err.message);
    }
}

findTable();
