import { getDbConnection } from './server/db.js';
import bcrypt from 'bcrypt';
import sql from 'mssql';

async function migrate() {
    console.log('Starting password migration...');
    try {
        const pool = await getDbConnection();

        // Fetch all users that might have a plain text password (assume len < 60 since bcrypt hashes are 60 chars)
        const result = await pool.request().query(`
            SELECT Id, Username, PasswordHash 
            FROM EBM.Users 
            WHERE LEN(PasswordHash) < 60 OR PasswordHash IS NULL
        `);

        const users = result.recordset;
        console.log(`Found ${users.length} users requiring password migration.`);

        for (const user of users) {
            const passwordToHash = user.PasswordHash || '123456';
            console.log(`Migrating password for user: ${user.Username}`);

            const salt = await bcrypt.genSalt(10);
            const hashedPwd = await bcrypt.hash(passwordToHash, salt);

            await pool.request()
                .input('id', sql.UniqueIdentifier, user.Id)
                .input('hash', sql.NVarChar, hashedPwd)
                .query(`
                    UPDATE EBM.Users 
                    SET PasswordHash = @hash 
                    WHERE Id = @id
                `);
        }

        console.log('Password migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
