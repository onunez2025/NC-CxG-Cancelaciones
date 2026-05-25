const { getDbConnection } = require('./dist/db.js');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT 
                t.Ticket,
                t.CodigoTecnico,
                t.NombreTecnico,
                t.ApellidoTecnico
            FROM [SIATC].[Dashboard_FSM] t
            WHERE t.Ticket = '1283338'
        `);
        console.log(result.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
