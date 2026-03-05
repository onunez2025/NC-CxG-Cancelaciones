import dotenv from 'dotenv';
import { getDbConnection } from './db.js';

dotenv.config();

const UPGRADE_URL = `
-- Drop Resend columns if they exist
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('EBM.Users') AND name = 'ResetToken')
BEGIN
    ALTER TABLE EBM.Users DROP COLUMN ResetToken;
    ALTER TABLE EBM.Users DROP COLUMN ResetTokenExpiry;
    PRINT 'Dropped obsolete Resend columns.';
END

-- Add new column for forcing password changes
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('EBM.Users') AND name = 'RequiresPasswordChange')
BEGIN
    ALTER TABLE EBM.Users ADD RequiresPasswordChange BIT NOT NULL DEFAULT 1;
    PRINT 'Added RequiresPasswordChange column to EBM.Users';
END
ELSE
BEGIN
    PRINT 'RequiresPasswordChange already exists.';
END
`;

async function runMigration() {
    try {
        console.log("Connecting to Azure SQL...");
        const pool = await getDbConnection();

        console.log("Executing Migration...");
        await pool.request().query(UPGRADE_URL);

        console.log("✅ SUCCESS: Migration completed successfully!");
        await pool.close();
        process.exit(0);
    } catch (err) {
        console.error("❌ ERROR: Failed to run migration.", err);
        process.exit(1);
    }
}

runMigration();
