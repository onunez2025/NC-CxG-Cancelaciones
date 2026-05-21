import { sql, getDbConnection } from './server/db/connection.ts';

async function main() {
    try {
        const pool = await getDbConnection();
        const request = pool.request();

        console.log('Actualizando Aprobado...');
        await request.query(`
            UPDATE [dbo].[GAC_APP_TB_CXG_NC]
            SET Aprobado = 'true'
            WHERE Aprobado IN ('Si', 'APROBADO', 'SÍ');

            UPDATE [dbo].[GAC_APP_TB_CXG_NC]
            SET Aprobado = 'false'
            WHERE Aprobado IN ('No', 'RECHAZADO', 'NO');
        `);

        console.log('Actualizando Procesado...');
        await request.query(`
            UPDATE [dbo].[GAC_APP_TB_CXG_NC]
            SET Procesado = 'true'
            WHERE Procesado IN ('Si', 'SI', 'SÍ');

            UPDATE [dbo].[GAC_APP_TB_CXG_NC]
            SET Procesado = 'false'
            WHERE Procesado IN ('No', 'NO');
        `);

        console.log('Migración completa.');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

main();
