import { getDbConnection } from './server/db.js';

async function check() {
    const pool = await getDbConnection();
    let res = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Dashboard_FSM'");
    console.log("Dashboard_FSM columns:", res.recordset.map(r => r.COLUMN_NAME).join(', '));
    res = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GAC_APP_TB_CANCELACIONES'");
    console.log("GAC_APP_TB_CANCELACIONES columns:", res.recordset.map(r => r.COLUMN_NAME).join(', '));
    process.exit(0);
}
check().catch(console.error);
