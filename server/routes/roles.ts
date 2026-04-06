import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

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
            WHERE r.Apps LIKE '%EBM%'
        `);

        // Group permissions by role since SQL returns flat rows
        const rolesMap = new Map();

        result.recordset.forEach((row: any) => {
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
    } catch (error: any) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: error.message });
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
            // 1. Insert Role
            const roleResult = await transaction.request()
                .input('name', name)
                .input('apps', apps || 'EBM')
                .query(`
                    INSERT INTO EBM.Roles (Name, Apps)
                    OUTPUT INSERTED.Id as id, INSERTED.Name as name, INSERTED.Apps as apps
                    VALUES (@name, @apps)
                `);

            const newRole = roleResult.recordset[0];

            // 2. Insert Permissions
            if (permissions && Array.isArray(permissions) && permissions.length > 0) {
                for (const perm of permissions) {
                    await transaction.request()
                        .input('roleId', newRole.id)
                        .input('permission', perm)
                        .query(`
                            INSERT INTO EBM.RolePermissions (RoleId, Permission)
                            VALUES (@roleId, @permission)
                        `);
                }
            }

            await transaction.commit();
            res.status(201).json({ ...newRole, permissions: permissions || [] });
        } catch (trxError) {
            await transaction.rollback();
            throw trxError;
        }

    } catch (error: any) {
        console.error('Error creating role:', error);
        res.status(500).json({ error: error.message });
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
            // 1. Update Role Name & Apps
            await transaction.request()
                .input('id', roleId)
                .input('name', name)
                .input('apps', apps || 'EBM')
                .query(`UPDATE EBM.Roles SET Name = @name, Apps = @apps WHERE Id = @id`);

            // 2. Refresh permissions: Delete ALL permissions for this role 
            // We delete all because the frontend sends the complete set (union of all apps)
            await transaction.request()
                .input('id', roleId)
                .query(`DELETE FROM EBM.RolePermissions WHERE RoleId = @id`);

            if (permissions && Array.isArray(permissions)) {
                for (const perm of permissions) {
                    await transaction.request()
                        .input('roleId', roleId)
                        .input('permission', perm)
                        .query(`
                            INSERT INTO EBM.RolePermissions (RoleId, Permission)
                            VALUES (@roleId, @permission)
                        `);
                }
            }

            await transaction.commit();
            res.json({ id: roleId, name, permissions });
        } catch (trxError) {
            await transaction.rollback();
            throw trxError;
        }
    } catch (error: any) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: error.message });
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
            await transaction.request()
                .input('id', roleId)
                .query(`DELETE FROM EBM.RolePermissions WHERE RoleId = @id`);

            // 2. Delete Role
            await transaction.request()
                .input('id', roleId)
                .query(`DELETE FROM EBM.Roles WHERE Id = @id`);

            await transaction.commit();
            res.status(204).send();
        } catch (trxError) {
            await transaction.rollback();
            throw trxError;
        }
    } catch (error: any) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
