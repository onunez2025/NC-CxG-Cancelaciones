import { getDbConnection } from './server/db.js';
import bcrypt from 'bcrypt';

async function resetAdmin() {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);

    const pool = await getDbConnection();
    const id = '6DCCEE69-5F0E-4762-B705-71E2CF2927D7'; // Hardcoded ID from DB dump

    await pool.request().query("UPDATE EBM.Users SET Username = 'admin', PasswordHash = '" + hash + "', RequiresPasswordChange = 1 WHERE Id = '" + id + "'");

    console.log("Admin user reset by ID: Username = 'admin', Password = 'admin123', RequiresPasswordChange = 1");
    await pool.close();
    process.exit(0);
}

resetAdmin().catch(console.error);
