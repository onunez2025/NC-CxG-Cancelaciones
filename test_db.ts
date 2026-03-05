import { getDbConnection } from './server/db.js';

async function checkTypes() {
    try {
        const pool = await getDbConnection();
        const res = await pool.request().query(`
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'EBM' AND TABLE_NAME IN ('Roles', 'Users', 'SAPUploads')
        `);
        console.log("Tipos de columnas:", res.recordset.filter(r => r.COLUMN_NAME === 'Id' || r.COLUMN_NAME === 'RoleId'));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkTypes();
