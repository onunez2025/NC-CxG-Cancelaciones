import dotenv from 'dotenv';
import { getDbConnection } from './db.js';

dotenv.config();

const ALTER_USERS_TABLE = `
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('EBM.Users') AND name = 'ResetToken'
)
BEGIN
    ALTER TABLE EBM.Users ADD ResetToken NVARCHAR(256) NULL;
    ALTER TABLE EBM.Users ADD ResetTokenExpiry DATETIME2 NULL;
    PRINT 'Added ResetToken and ResetTokenExpiry columns to EBM.Users table.';
END
ELSE
BEGIN
    PRINT 'Columns already exist. Skipping.';
END
`;

async function runMigration() {
    try {
        console.log("Connecting to Azure SQL...");
        const pool = await getDbConnection();

        console.log("Executing Migration...");
        await pool.request().query(ALTER_USERS_TABLE);

        console.log("✅ SUCCESS: Migration completed successfully!");
        await pool.close();
        process.exit(0);
    } catch (err) {
        console.error("❌ ERROR: Failed to run migration.", err);
        process.exit(1);
    }
}

runMigration();
