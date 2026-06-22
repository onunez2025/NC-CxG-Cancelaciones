import { getDbConnection } from './server/db.ts';
import sql from 'mssql';

async function main() {
    try {
        const pool = await getDbConnection();
        const request = pool.request();
        
        const res1 = await request.query(`
            SELECT ID_Apro_CxG_NC, Aprobado, Aprobado_motivo, Aprobado_observacion, Aprobado_por, Aprobado_el 
            FROM [dbo].[GAC_APP_TB_CXG_NC] 
            WHERE Ticket = '1271626'
        `);
        console.dir(res1.recordset, { depth: null });
        
        if (res1.recordset.length > 0) {
            const id = res1.recordset[0].ID_Apro_CxG_NC;
            const res2 = await request.input('id', sql.VarChar(255), id).query(`
                SELECT * FROM [dbo].[GAC_APP_TB_HISTOTIAL_APROB_CXG_NC]
                WHERE Solicitud = @id
            `);
            console.log("HISTORY:");
            console.dir(res2.recordset, { depth: null });
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
main();
