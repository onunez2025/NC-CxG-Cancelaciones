import { getDbConnection } from './server/db.js';

async function updateDb() {
    const pool = await getDbConnection();
    try {
        await pool.request().query("ALTER TABLE EBM.Users ADD FullName NVARCHAR(100) NULL");

        // Also, let's copy the existing user "Username" string into FullName for existing users so it's not null on login UI
        await pool.request().query("UPDATE EBM.Users SET FullName = Username WHERE FullName IS NULL");
        console.log("FullName column added and populated.");
    } catch (error: any) {
        if (error.number === 2705) {
            console.log("Column already exists.");
        } else {
            console.error("Migration error:", error);
        }
    }
    process.exit(0);
}
updateDb();
