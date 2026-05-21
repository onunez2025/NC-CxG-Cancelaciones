const sql = require('mssql');
require('dotenv').config();

async function check() {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            options: { encrypt: true, trustServerCertificate: true }
        });

        const res = await pool.request().query(`
            SELECT 
                t.name AS TableName,
                i.name AS IndexName,
                c.name AS ColumnName,
                i.type_desc AS IndexType
            FROM sys.indexes i
            INNER JOIN sys.tables t ON t.object_id = i.object_id
            INNER JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
            INNER JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE t.name IN ('GAC_APP_TB_CXG_NC', 'Dashboard_FSM')
        `);
        console.table(res.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
