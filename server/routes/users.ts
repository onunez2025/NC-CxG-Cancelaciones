import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { logAudit } from '../middleware/auth.js';

const router = Router();
const APP_IDENTIFIER = 'EBM';
const cleanApps = (str: string) => [...new Set((str || '').split(',').map(s => s.trim()).filter(Boolean))].join(', ');

// GET all Users
router.get('/', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        // Return users without PasswordHash for security
        // Also joining Roles and Managements to include names, matching User interface
        const result = await pool.request()
            .input('app', APP_IDENTIFIER)
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
                WHERE u.Apps LIKE '%' + @app + '%'
            `);
        res.json(result.recordset);
    } catch (error: any) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST new User
router.post('/', async (req: Request, res: Response) => {
    try {
        const { full_name, username, email, password_hash, role_id, management_id, language = 'es', theme = 'light', apps } = req.body;

        if (!full_name || !username || !email || !role_id || !management_id) {
            return res.status(400).json({ error: 'Nombre completo, usuario, email, rol y gerencia son requeridos' });
        }

        const pool = await getDbConnection();

        // 1. Check if user already exists (by Username or Email)
        const checkResult = await pool.request()
            .input('username', username)
            .input('email', email)
            .query("SELECT Id, Apps FROM EBM.Users WHERE Username = @username OR Email = @email");

        const appsToSaveInput = Array.isArray(apps) ? apps.join(', ') : (apps || APP_IDENTIFIER);
        const appsToSave = cleanApps(appsToSaveInput);

        if (checkResult.recordset.length > 0) {
            // 2a. User EXISTS -> UPSERT (Update existing user)
            const existingUser = checkResult.recordset[0];
            const userId = existingUser.Id || existingUser.id;
            const mergedApps = cleanApps(existingUser.Apps + ', ' + APP_IDENTIFIER);

            await pool.request()
                .input('id', userId)
                .input('fullName', full_name)
                .input('roleId', role_id)
                .input('managementId', management_id)
                .input('apps', mergedApps)
                .input('avatarUrl', req.body.avatar_url || null)
                .query(`
                    UPDATE EBM.Users 
                    SET FullName = @fullName, RoleId = @roleId, ManagementId = @managementId, Apps = @apps, AvatarUrl = @avatarUrl, IsActive = 1
                    WHERE Id = @id
                `);

            await logAudit(req, 'REACTIVATE/UPDATE', 'USERS', username, { apps: mergedApps });

            const updatedUserResult = await pool.request().input('id', userId).query(`
                SELECT u.Id as id, u.FullName as full_name, u.Username as username, u.Email as email,
                       u.RoleId as role_id, u.ManagementId as management_id,
                       CAST(u.IsActive AS BIT) as is_active, u.CreatedAt as created_at,
                       u.Language as language, u.Theme as theme, u.AvatarUrl as avatar_url, u.Apps as apps
                FROM EBM.Users u WHERE u.Id = @id
            `);
            return res.status(200).json(updatedUserResult.recordset[0]);
        }

        // 2b. User DOES NOT exist -> New INSERT
        const passwordToHash = password_hash || crypto.randomBytes(6).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwordToHash, salt);

        const result = await pool.request()
            .input('fullName', full_name)
            .input('username', username)
            .input('email', email)
            .input('password', hashedPassword)
            .input('roleId', role_id)
            .input('managementId', management_id)
            .input('language', language)
            .input('theme', theme)
            .input('avatarUrl', req.body.avatar_url || null)
            .input('apps', appsToSave)
            .query(`
                INSERT INTO EBM.Users (FullName, Username, Email, PasswordHash, RoleId, ManagementId, Language, Theme, RequiresPasswordChange, AvatarUrl, Apps)
                OUTPUT 
                    INSERTED.Id as id, INSERTED.FullName as full_name, INSERTED.Username as username, INSERTED.Email as email,
                    INSERTED.RoleId as role_id, INSERTED.ManagementId as management_id,
                    CAST(INSERTED.IsActive AS BIT) as is_active, INSERTED.CreatedAt as created_at,
                    INSERTED.Language as language, INSERTED.Theme as theme,
                    CAST(INSERTED.RequiresPasswordChange AS BIT) as requires_password_change,
                    INSERTED.AvatarUrl as avatar_url, INSERTED.Apps as apps
                VALUES (@fullName, @username, @email, @password, @roleId, @managementId, @language, @theme, 1, @avatarUrl, @apps)
            `);

        const createdUser = result.recordset[0];
        await logAudit(req, 'CREATE', 'USERS', username, { apps: appsToSave });
        res.status(201).json(createdUser);
    } catch (error: any) {
        console.error('Error in router.post(/):', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT update User
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const { full_name, username, email, role_id, management_id, is_active, language, theme, password_hash, avatar_url, apps } = req.body;

        const pool = await getDbConnection();

        let queryStr = `
            UPDATE EBM.Users 
            SET FullName = @fullName,
                Username = @username, 
                Email = @email, 
                RoleId = @role_id, 
                ManagementId = @managementId, 
                IsActive = @isActive,
                Language = @language,
                Theme = @theme,
                AvatarUrl = @avatarUrl,
                Apps = @apps
        `;

        const appsToSaveInput = Array.isArray(apps) ? apps.join(', ') : (apps || APP_IDENTIFIER);
        const appsToSave = cleanApps(appsToSaveInput);

        const request = pool.request()
            .input('id', userId)
            .input('fullName', full_name)
            .input('username', username)
            .input('email', email)
            .input('role_id', role_id)
            .input('managementId', management_id)
            .input('isActive', is_active ? 1 : 0)
            .input('language', language)
            .input('theme', theme)
            .input('avatarUrl', avatar_url || null)
            .input('apps', appsToSave);

        // Only update password if provided
        if (password_hash && password_hash.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPwd = await bcrypt.hash(password_hash, salt);

            // If the user updating is the same as the user being updated, don't force them to change it again
            const isSelfUpdate = (req as any).user?.id === userId;
            const forceChange = isSelfUpdate ? 0 : 1;

            queryStr += `, PasswordHash = @password, RequiresPasswordChange = ${forceChange} `;
            request.input('password', hashedPwd);
        }

        queryStr += `
            OUTPUT 
                INSERTED.Id as id, INSERTED.FullName as full_name, INSERTED.Username as username, INSERTED.Email as email,
                INSERTED.RoleId as role_id, INSERTED.ManagementId as management_id,
                CAST(INSERTED.IsActive AS BIT) as is_active, INSERTED.CreatedAt as created_at,
                INSERTED.Language as language, INSERTED.Theme as theme,
                CAST(INSERTED.RequiresPasswordChange AS BIT) as requires_password_change,
                INSERTED.AvatarUrl as avatar_url
            WHERE Id = @id
        `;

        const result = await request.query(queryStr);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updatedUser = result.recordset[0];
        await logAudit(req, 'UPDATE', 'USERS', userId, { apps: appsToSave });
        res.json(updatedUser);
    } catch (error: any) {
        console.error('Error updating user:', error);
        if (error.number === 2601 || error.number === 2627) {
            return res.status(400).json({ error: 'El nombre de usuario o correo electrónico ya están registrados.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// DELETE User
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const pool = await getDbConnection();

        // Soft delete or hard delete? Let's do hard delete for now, or just deactivate.
        // EBM uses is_active mostly, but delete in storage was absolute. We'll do hard delete.
        const result = await pool.request()
            .input('id', userId)
            .query(`UPDATE EBM.Users SET IsActive = 0 WHERE Id = @id`);

        await logAudit(req, 'DEACTIVATE', 'USERS', userId, {});

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(204).send();
    } catch (error: any) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
