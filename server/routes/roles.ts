import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import { addInput, sql } from '../lib/db.js';
import { logAudit } from '../middleware/auth.js';

const router = Router();
const APP_IDENTIFIER = 'EBM';
const cleanApps = (str: string) => [...new Set((str || '').split(',').map(s => s.trim()).filter(Boolean))].join(', ');

// GET all Roles and their permissions
router.get('/', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        // We get roles and left join permissions to aggregate them
        const result = await pool.request().query(`
                SELECT 
                    r.Id as id,
                    r.Name as name,
                    r.Apps as apps,
                    p.Permission as permission
                FROM EBM.Roles r
                LEFT JOIN EBM.RolePermissions p ON r.Id = p.RoleId
            `);

        // Group permissions by role since SQL returns flat rows
        const rolesMap = new Map();

        result.recordset.forEach((row: { id: string; name: string; apps: string; permission: string | null }) => {
            if (!rolesMap.has(row.id)) {
                rolesMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    apps: row.apps,
                    permissions: []
                });
            }
            if (row.permission) {
                rolesMap.get(row.id).permissions.push(row.permission);
            }
        });

        res.json(Array.from(rolesMap.values()));
    } catch (error: unknown) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// POST new Role
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, permissions, apps } = req.body;

        if (!name) return res.status(400).json({ error: 'Role name is required' });

        const pool = await getDbConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const appsToSaveInput = Array.isArray(apps) ? apps.join(', ') : (apps || APP_IDENTIFIER);
            const appsToSave = cleanApps(appsToSaveInput);

            // 1. Insert Role
            const insertRoleReq = transaction.request();
            addInput(insertRoleReq, 'name', sql.NVarChar(200), name);
            addInput(insertRoleReq, 'apps', sql.NVarChar(sql.MAX), appsToSave);
            const roleResult = await insertRoleReq.query(`
                    INSERT INTO EBM.Roles (Name, Apps)
                    OUTPUT INSERTED.Id as id, INSERTED.Name as name, INSERTED.Apps as apps
                    VALUES (@name, @apps)
                `);

            const newRole = roleResult.recordset[0];

            // 2. Insert Permissions
            if (permissions && Array.isArray(permissions) && permissions.length > 0) {
                for (const perm of permissions) {
                    const permReq = transaction.request();
                    addInput(permReq, 'roleId', sql.UniqueIdentifier, newRole.id);
                    addInput(permReq, 'permission', sql.VarChar(100), perm);
                    await permReq.query(`
                            INSERT INTO EBM.RolePermissions (RoleId, Permission)
                            VALUES (@roleId, @permission)
                        `);
                }
            }

            await transaction.commit();
            await logAudit(req, 'CREATE', 'ROLES', name, { apps: appsToSave });
            res.status(201).json({ ...newRole, permissions: permissions || [] });
        } catch (trxError) {
            await transaction.rollback();
            throw trxError;
        }

    } catch (error: unknown) {
        console.error('Error creating role:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// PUT update Role
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const roleId = req.params.id;
        const { name, permissions, apps } = req.body;

        const pool = await getDbConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const appsToSaveInput = Array.isArray(apps) ? apps.join(', ') : (apps || APP_IDENTIFIER);
            const appsToSave = cleanApps(appsToSaveInput);

            // 1. Update Role Name & Apps
            const updateRoleReq = transaction.request();
            addInput(updateRoleReq, 'id', sql.UniqueIdentifier, roleId);
            addInput(updateRoleReq, 'name', sql.NVarChar(200), name);
            addInput(updateRoleReq, 'apps', sql.NVarChar(sql.MAX), appsToSave);
            await updateRoleReq.query(`UPDATE EBM.Roles SET Name = @name, Apps = @apps WHERE Id = @id`);

            // 2. Refresh permissions: Delete ALL permissions for this role
            // We delete all because the frontend sends the complete set (union of all apps)
            const deletePermsReq = transaction.request();
            addInput(deletePermsReq, 'id', sql.UniqueIdentifier, roleId);
            await deletePermsReq.query(`DELETE FROM EBM.RolePermissions WHERE RoleId = @id`);

            if (permissions && Array.isArray(permissions)) {
                for (const perm of permissions) {
                    const permReq = transaction.request();
                    addInput(permReq, 'roleId', sql.UniqueIdentifier, roleId);
                    addInput(permReq, 'permission', sql.VarChar(100), perm);
                    await permReq.query(`
                            INSERT INTO EBM.RolePermissions (RoleId, Permission)
                            VALUES (@roleId, @permission)
                        `);
                }
            }

            await transaction.commit();
            await logAudit(req, 'UPDATE', 'ROLES', roleId, { apps: appsToSave });
            res.json({ id: roleId, name, permissions });
        } catch (trxError) {
            await transaction.rollback();
            throw trxError;
        }
    } catch (error: unknown) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// DELETE Role
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const roleId = req.params.id;
        const pool = await getDbConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Delete permissions first (FK constraint)
            const delPermsReq = transaction.request();
            addInput(delPermsReq, 'id', sql.UniqueIdentifier, roleId);
            await delPermsReq.query(`DELETE FROM EBM.RolePermissions WHERE RoleId = @id`);

            // 2. Delete Role
            const delRoleReq = transaction.request();
            addInput(delRoleReq, 'id', sql.UniqueIdentifier, roleId);
            await delRoleReq.query(`DELETE FROM EBM.Roles WHERE Id = @id`);

            await transaction.commit();
            await logAudit(req, 'DELETE', 'ROLES', roleId, {});
            res.status(204).send();
        } catch (trxError) {
            await transaction.rollback();
            throw trxError;
        }
    } catch (error: unknown) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

export default router;
