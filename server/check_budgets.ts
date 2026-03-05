import { getDbConnection } from './db.js';

async function check() {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME IN ('Budgets', 'BudgetMonths')
        `);
        console.table(result.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
