import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_do_not_use';

// POST Login Endpoint
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const pool = await getDbConnection();
        // Extract user data joining Roles for full session payload
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
                    r.Name as role_name,
                    u.ManagementId as management_id,
                    m.Name as management_name,
                    CAST(u.IsActive AS BIT) as is_active,
                    u.CreatedAt as created_at,
                    u.Language as language,
                    u.Theme as theme,
                    u.AvatarUrl as avatar_url,
                    u.Apps as apps
                FROM EBM.Users u
                LEFT JOIN EBM.Roles r ON u.RoleId = r.Id
                LEFT JOIN EBM.Managements m ON u.ManagementId = m.Id
                WHERE u.Username = @username AND u.IsActive = 1
            `);

        const user = userResult.recordset[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials or user disabled' });
        }

        // Fetch permissions for the user's role
        const permsResult = await pool.request()
            .input('roleId', user.role_id)
            .query('SELECT Permission FROM EBM.RolePermissions WHERE RoleId = @roleId');

        user.permissions = permsResult.recordset.map((p: any) => p.Permission);

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        // Handle migration edge case: if they still have a plain text password matching exactly
        // Remove this fallback once all users are migrated.
        const isLegacyMatch = user.password_hash === password;

        if (!isMatch && !isLegacyMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Return user without password
        const { password_hash, ...safeUser } = user;

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                role_id: user.role_id,
                role_name: user.role_name,
                management_id: user.management_id,
                username: user.username,
                full_name: user.full_name,
                permissions: user.permissions,
                apps: user.apps
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return structured as AuthResponse
        res.json({
            user: safeUser,
            token
        });

    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
});

// GET Current User (Validate Session)
router.get('/me', verifyToken, async (req: Request, res: Response) => {
    try {
        // userId now comes from the verified JWT payload, not an insecure header
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }

        const pool = await getDbConnection();
        const userResult = await pool.request()
            .input('id', userId)
            .query(`
        SELECT
        u.Id as id,
            u.FullName as full_name,
            u.Username as username,
            u.Email as email,
            u.RoleId as role_id,
            r.Name as role_name,
            u.ManagementId as management_id,
            m.Name as management_name,
            CAST(u.IsActive AS BIT) as is_active,
            u.CreatedAt as created_at,
            u.Language as language,
            u.Theme as theme,
            u.AvatarUrl as avatar_url,
            u.Apps as apps
                FROM EBM.Users u
                LEFT JOIN EBM.Roles r ON u.RoleId = r.Id
                LEFT JOIN EBM.Managements m ON u.ManagementId = m.Id
                WHERE u.Id = @id AND u.IsActive = 1
            `);

        const user = userResult.recordset[0];

        if (!user) {
            return res.status(401).json({ error: 'User not found or disabled' });
        }

        const permsResult = await pool.request()
            .input('roleId', user.role_id)
            .query('SELECT Permission FROM EBM.RolePermissions WHERE RoleId = @roleId');

        user.permissions = permsResult.recordset.map((p: any) => p.Permission);

        res.json({ user });

    } catch (error: any) {
        console.error('Validate session error:', error);
        res.status(500).json({ error: 'Internal server error during session validation' });
    }
});

// POST Force Change Password
router.post('/force-change-password', verifyToken, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const pool = await getDbConnection();
        const userResult = await pool.request()
            .input('id', userId)
            .query('SELECT PasswordHash FROM EBM.Users WHERE Id = @id');

        const user = userResult.recordset[0];
        if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });

        const isMatch = await bcrypt.compare(currentPassword, user.PasswordHash);
        const isLegacyMatch = user.PasswordHash === currentPassword;

        if (!isMatch && !isLegacyMatch) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
        }

        const isSame = await bcrypt.compare(newPassword, user.PasswordHash);
        if (isSame || newPassword === currentPassword) {
            return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la temporal' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await pool.request()
            .input('hash', passwordHash)
            .input('id', userId)
            .query('UPDATE EBM.Users SET PasswordHash = @hash, RequiresPasswordChange = 0 WHERE Id = @id');

        res.json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (err: any) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router;
