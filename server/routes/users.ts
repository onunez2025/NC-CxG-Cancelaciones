import { safeError } from '../lib/security.js';
import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import { addInput, sql } from '../lib/db.js';
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
        const getUsersReq = pool.request();
        addInput(getUsersReq, 'app', sql.VarChar(50), APP_IDENTIFIER);
        const result = await getUsersReq.query(`
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
            `);
        res.json(result.recordset);
    } catch (error: unknown) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: safeError(error) });
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
        const checkReq = pool.request();
        addInput(checkReq, 'username', sql.NVarChar(200), username);
        addInput(checkReq, 'email', sql.NVarChar(200), email);
        const checkResult = await checkReq.query("SELECT Id, Apps FROM EBM.Users WHERE Username = @username OR Email = @email");

        const appsToSaveInput = Array.isArray(apps) ? apps.join(', ') : (apps || APP_IDENTIFIER);
        const appsToSave = cleanApps(appsToSaveInput);

        if (checkResult.recordset.length > 0) {
            // 2a. User EXISTS -> UPSERT (Update existing user)
            const existingUser = checkResult.recordset[0];
            const userId = existingUser.Id || existingUser.id;
            const mergedApps = cleanApps(existingUser.Apps + ', ' + APP_IDENTIFIER);

            const upsertReq = pool.request();
            addInput(upsertReq, 'id', sql.UniqueIdentifier, userId);
            addInput(upsertReq, 'fullName', sql.NVarChar(200), full_name);
            addInput(upsertReq, 'roleId', sql.UniqueIdentifier, role_id);
            addInput(upsertReq, 'managementId', sql.UniqueIdentifier, management_id);
            addInput(upsertReq, 'apps', sql.NVarChar(sql.MAX), mergedApps);
            addInput(upsertReq, 'avatarUrl', sql.NVarChar(500), req.body.avatar_url || null);
            await upsertReq.query(`
                    UPDATE EBM.Users
                    SET FullName = @fullName, RoleId = @roleId, ManagementId = @managementId, Apps = @apps, AvatarUrl = @avatarUrl, IsActive = 1
                    WHERE Id = @id
                `);

            await logAudit(req, 'REACTIVATE/UPDATE', 'USERS', username, { apps: mergedApps });

            const refetchReq = pool.request();
            addInput(refetchReq, 'id', sql.UniqueIdentifier, userId);
            const updatedUserResult = await refetchReq.query(`
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

        const insertReq = pool.request();
        addInput(insertReq, 'fullName', sql.NVarChar(200), full_name);
        addInput(insertReq, 'username', sql.NVarChar(200), username);
        addInput(insertReq, 'email', sql.NVarChar(200), email);
        addInput(insertReq, 'password', sql.NVarChar(sql.MAX), hashedPassword);
        addInput(insertReq, 'roleId', sql.UniqueIdentifier, role_id);
        addInput(insertReq, 'managementId', sql.UniqueIdentifier, management_id);
        addInput(insertReq, 'language', sql.VarChar(10), language);
        addInput(insertReq, 'theme', sql.VarChar(20), theme);
        addInput(insertReq, 'avatarUrl', sql.NVarChar(500), req.body.avatar_url || null);
        addInput(insertReq, 'apps', sql.NVarChar(sql.MAX), appsToSave);
        const result = await insertReq.query(`
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
    } catch (error: unknown) {
        console.error('Error in router.post(/):', error);
        res.status(500).json({ error: safeError(error) });
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

        const request = pool.request();
        addInput(request, 'id', sql.UniqueIdentifier, userId);
        addInput(request, 'fullName', sql.NVarChar(200), full_name);
        addInput(request, 'username', sql.NVarChar(200), username);
        addInput(request, 'email', sql.NVarChar(200), email);
        addInput(request, 'role_id', sql.UniqueIdentifier, role_id);
        addInput(request, 'managementId', sql.UniqueIdentifier, management_id);
        addInput(request, 'isActive', sql.Bit, is_active ? 1 : 0);
        addInput(request, 'language', sql.VarChar(10), language);
        addInput(request, 'theme', sql.VarChar(20), theme);
        addInput(request, 'avatarUrl', sql.NVarChar(500), avatar_url || null);
        addInput(request, 'apps', sql.NVarChar(sql.MAX), appsToSave);

        // Only update password if provided
        if (password_hash && password_hash.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPwd = await bcrypt.hash(password_hash, salt);

            // If the user updating is the same as the user being updated, don't force them to change it again
            const isSelfUpdate = (req as { user?: { id: string } }).user?.id === userId;
            const forceChange = isSelfUpdate ? 0 : 1;

            queryStr += `, PasswordHash = @password, RequiresPasswordChange = ${forceChange} `;
            addInput(request, 'password', sql.NVarChar(sql.MAX), hashedPwd);
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
    } catch (error: unknown) {
        console.error('Error updating user:', error);
        const sqlErr = error as { number?: number };
        if (sqlErr.number === 2601 || sqlErr.number === 2627) {
            return res.status(400).json({ error: 'El nombre de usuario o correo electrónico ya están registrados.' });
        }
        res.status(500).json({ error: safeError(error) });
    }
});

// DELETE User
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const pool = await getDbConnection();

        // Soft delete or hard delete? Let's do hard delete for now, or just deactivate.
        // EBM uses is_active mostly, but delete in storage was absolute. We'll do hard delete.
        const deactivateReq = pool.request();
        addInput(deactivateReq, 'id', sql.UniqueIdentifier, userId);
        const result = await deactivateReq.query(`UPDATE EBM.Users SET IsActive = 0 WHERE Id = @id`);

        await logAudit(req, 'DEACTIVATE', 'USERS', userId, {});

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(204).send();
    } catch (error: unknown) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: safeError(error) });
    }
});

export default router;
