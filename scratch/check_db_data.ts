
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

async function checkData() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(sqlConfig);
        console.log('Connected!');

        const tables = [
            '[dbo].[GAC_APP_TB_CANCELACIONES]',
            '[dbo].[GAC_APP_TB_CXG_NC]',
            '[dbo].[Dashboard_FSM]',
            '[dbo].[GAC_APP_TB_VALORIZACIONES_DETALLE]'
        ];

        for (const table of tables) {
            try {
                const result = await pool.request().query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`Table ${table}: ${result.recordset[0].count} rows`);
            } catch (err) {
                console.error(`Error checking table ${table}:`, err.message);
            }
        }

        await pool.close();
    } catch (err) {
        console.error('Database Connection Failed!', err.message);
    }
}

checkData();
