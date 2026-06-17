import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { addInput, sql } from '../lib/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_do_not_use';

const loginSchema = z.object({
    username: z.string().min(1, 'Usuario requerido').max(255),
    password: z.string().min(1, 'Contraseña requerida').max(255),
});

// POST Login Endpoint
router.post('/login', async (req: Request, res: Response) => {
    try {
        const parseResult = loginSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: 'Datos de login inválidos', details: parseResult.error.issues });
        }
        const { username, password } = parseResult.data;

        const pool = await getDbConnection();
        const userResult = await pool.request()
            .input('username', sql.NVarChar, username)
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
        const permsReq = pool.request();
        addInput(permsReq, 'roleId', sql.UniqueIdentifier, user.role_id);
        const permsResult = await permsReq.query('SELECT Permission FROM EBM.RolePermissions WHERE RoleId = @roleId');

        user.permissions = permsResult.recordset.map((p: { Permission: string }) => p.Permission);

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Return user without password
        const { password_hash: _password_hash, ...safeUser } = user;

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

        const ssoToken = jwt.sign(
            { id: user.id, role: user.role_name, role_name: user.role_name, username: user.username, apps: user.apps || '', casId: null },
            JWT_SECRET, { expiresIn: '24h' }
        );
        if (process.env.NODE_ENV === 'production') {
            res.cookie('token', ssoToken, { domain: '.siatc.cloud', maxAge: 24 * 60 * 60 * 1000, httpOnly: false, secure: true, sameSite: 'lax', path: '/' });
        }

        res.json({
            user: safeUser,
            token
        });

    } catch (error: unknown) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
});

// GET Current User (Validate Session)
router.get('/me', verifyToken, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }

        const pool = await getDbConnection();
        const userResult = await pool.request()
            .input('id', sql.UniqueIdentifier, userId)
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

        const permsReq2 = pool.request();
        addInput(permsReq2, 'roleId', sql.UniqueIdentifier, user.role_id);
        const permsResult = await permsReq2.query('SELECT Permission FROM EBM.RolePermissions WHERE RoleId = @roleId');

        user.permissions = permsResult.recordset.map((p: { Permission: string }) => p.Permission);

        const ssoToken = jwt.sign(
            { id: user.id, role: user.role_name, role_name: user.role_name, username: user.username, apps: user.apps || '', casId: null },
            JWT_SECRET, { expiresIn: '24h' }
        );
        if (process.env.NODE_ENV === 'production') {
            res.cookie('token', ssoToken, { domain: '.siatc.cloud', maxAge: 24 * 60 * 60 * 1000, httpOnly: false, secure: true, sameSite: 'lax', path: '/' });
        }

        res.json({ user });

    } catch (error: unknown) {
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
            .input('id', sql.UniqueIdentifier, userId)
            .query('SELECT PasswordHash FROM EBM.Users WHERE Id = @id');

        const user = userResult.recordset[0];
        if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });

        const isMatch = await bcrypt.compare(currentPassword, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
        }

        const isSame = await bcrypt.compare(newPassword, user.PasswordHash);
        if (isSame || newPassword === currentPassword) {
            return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la temporal' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await pool.request()
            .input('hash', sql.NVarChar, passwordHash)
            .input('id', sql.UniqueIdentifier, userId)
            .query('UPDATE EBM.Users SET PasswordHash = @hash, RequiresPasswordChange = 0 WHERE Id = @id');

        res.json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (err: unknown) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router;
