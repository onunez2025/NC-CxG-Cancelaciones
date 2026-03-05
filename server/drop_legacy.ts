import { getDbConnection } from './db.js';

async function dropLegacyTable() {
    try {
        const pool = await getDbConnection();
        console.log('Procediendo a eliminar la tabla legacy EBM.SAPLineItems...');
        await pool.request().query(`IF OBJECT_ID('EBM.SAPLineItems', 'U') IS NOT NULL DROP TABLE EBM.SAPLineItems;`);
        console.log('Tabla EBM.SAPLineItems eliminada exitosamente.');
        process.exit(0);
    } catch (err) {
        console.error('Error al eliminar tabla legacy: ', err);
        process.exit(1);
    }
}

dropLegacyTable();
