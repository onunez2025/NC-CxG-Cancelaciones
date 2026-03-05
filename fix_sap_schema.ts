import { getDbConnection } from './server/db.js';

async function fixTable() {
    try {
        const pool = await getDbConnection();
        console.log('Dropping EBM.SAPUploads...');
        await pool.request().query(`DROP TABLE IF EXISTS EBM.SAPUploads;`);

        console.log('Creating EBM.SAPUploads correctly...');
        await pool.request().query(`
            CREATE TABLE EBM.SAPUploads (
                Id NVARCHAR(50) PRIMARY KEY,
                TransactionType NVARCHAR(20) NOT NULL,
                UploadDate DATETIME2 NOT NULL,
                UploadedBy NVARCHAR(100) NOT NULL,
                Data NVARCHAR(MAX) NOT NULL
            );
        `);
        console.log('Done!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fixTable();
