import { getDbConnection } from './server/db.js';
async function test() {
    try {
        const pool = await getDbConnection();
        const r = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'SAPUploads' AND TABLE_SCHEMA = 'EBM'
        `);
        console.table(r.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
