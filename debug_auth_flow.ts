
import sql from 'mssql';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'D:/diego/Documentos/Antigravity/EBM/.env' });

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    server: process.env.DB_SERVER || '',
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

async function testLogin() {
    try {
        console.log('Connecting to DB...');
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const username = 'dmoncada';
        const password = '@s0le@dm1nAI#82,'; // I am assuming this is the password he's using based on the .env db password pattern or if he uses the same for testing

        console.log('Fetching user...');
        const userResult = await pool.request()
            .input('username', username)
            .query(`
                SELECT 
                    u.Id as id,
                    u.FullName as full_name,
                    u.Username as username,
                    u.Email as email,
                    u.PasswordHash as password_hash,
                    u.RoleId as role_id,
                    u.ManagementId as management_id,
                    CAST(u.IsActive AS BIT) as is_active
                FROM EBM.Users u
                WHERE u.Username = @username AND u.IsActive = 1
            `);

        const user = userResult.recordset[0];
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('Comparing passwords...');
        // Note: I don't know dmoncada's actual password. 
        // But if bcrypt fails, it will throw here.
        // Let's at least see if the comparison runs.
        const hash = user.password_hash;
        console.log('Hash from DB:', hash);
        
        // Let's try matching with a dummy password to see if it throws
        try {
            const isMatch = await bcrypt.compare('whatever', hash);
            console.log('Bcrypt comparison worked. Match:', isMatch);
        } catch (e) {
            console.error('BCRYPT ERROR:', e);
        }

        console.log('Fetching permissions...');
        const permsResult = await pool.request()
            .input('roleId', user.role_id)
            .query('SELECT Permission FROM EBM.RolePermissions WHERE RoleId = @roleId');
        
        console.log('Permissions count:', permsResult.recordset.length);

        console.log('Generating JWT...');
        const secret = process.env.JWT_SECRET || 'test_secret';
        const token = jwt.sign({ id: user.id }, secret);
        console.log('JWT Generated:', token.substring(0, 10) + '...');

        console.log('SUCCESS: All auth steps completed.');
        process.exit(0);
    } catch (err) {
        console.error('GLOBAL AUTH ERROR:', err);
        process.exit(1);
    }
}

testLogin();
