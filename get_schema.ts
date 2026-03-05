import { getDbConnection } from './server/db.js';

async function check() {
    const pool = await getDbConnection();
    const res = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users'");
    console.table(res.recordset);
    process.exit(0);
}
check().catch(console.error);
