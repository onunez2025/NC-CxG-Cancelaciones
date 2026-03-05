
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

async function listTables() {
    try {
        await sql.connect(config);
        const result = await sql.query(`
            SELECT SCHEMA_NAME(schema_id) AS SchemaName, name AS TableName 
            FROM sys.tables
        `);
        console.table(result.recordset);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

listTables();
