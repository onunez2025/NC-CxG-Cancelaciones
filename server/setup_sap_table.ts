import { getDbConnection } from './db.js';

async function setupSapTable() {
    try {
        console.log('Connecting to database...');
        const pool = await getDbConnection();

        console.log('Creating EBM.SAPUploads table if not exists...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[EBM].[SAPUploads]') AND type in (N'U'))
            BEGIN
                CREATE TABLE EBM.SAPUploads (
                    Id NVARCHAR(50) PRIMARY KEY,
                    TransactionType NVARCHAR(20) NOT NULL,
                    UploadDate DATETIME NOT NULL,
                    UploadedBy NVARCHAR(100) NOT NULL,
                    Data NVARCHAR(MAX) NOT NULL -- Stores the JSON array of the parsed rows
                );
            END
        `);

        console.log('Table EBM.SAPUploads ready!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
}

setupSapTable();
