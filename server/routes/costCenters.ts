import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';

const router = Router();

// GET all Cost Centers
router.get('/', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        // Return Cost Centers joined with Managements for consistency with frontend interface
        const result = await pool.request().query(`
            SELECT 
                c.Id as id,
                c.Code as code,
                c.Name as name,
                c.ManagementId as management_id,
                CAST(c.IsActive AS BIT) as is_active,
                m.Name as management_name
            FROM EBM.CostCenters c
            LEFT JOIN EBM.Managements m ON c.ManagementId = m.Id
        `);
        res.json(result.recordset);
    } catch (error: any) {
        console.error('Error fetching cost centers:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST new Cost Center
router.post('/', async (req: Request, res: Response) => {
    try {
        const { code, name, management_id, is_active = true } = req.body;

        if (!code || !name || !management_id) {
            return res.status(400).json({ error: 'Code, Name, and Management ID are required' });
        }

        const pool = await getDbConnection();
        const result = await pool.request()
            .input('code', code)
            .input('name', name)
            .input('managementId', management_id)
            .input('isActive', is_active ? 1 : 0)
            .query(`
                INSERT INTO EBM.CostCenters (Id, Code, Name, ManagementId, IsActive)
                OUTPUT INSERTED.Id as id, INSERTED.Code as code, INSERTED.Name as name, 
                       INSERTED.ManagementId as management_id, CAST(INSERTED.IsActive AS BIT) as is_active
                VALUES (NEWID(), @code, @name, @managementId, @isActive)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (error: any) {
        console.error('Error creating cost center:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT update Cost Center
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { code, name, management_id, is_active } = req.body;

        if (!code || !name || !management_id) {
            return res.status(400).json({ error: 'Code, Name, and Management ID are required' });
        }

        const pool = await getDbConnection();
        const result = await pool.request()
            .input('id', id)
            .input('code', code)
            .input('name', name)
            .input('managementId', management_id)
            .input('isActive', is_active !== undefined ? (is_active ? 1 : 0) : 1)
            .query(`
                UPDATE EBM.CostCenters
                SET Code = @code, Name = @name, ManagementId = @managementId, IsActive = @isActive
                OUTPUT INSERTED.Id as id, INSERTED.Code as code, INSERTED.Name as name, 
                       INSERTED.ManagementId as management_id, CAST(INSERTED.IsActive AS BIT) as is_active
                WHERE Id = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Cost Center not found' });
        }

        res.json(result.recordset[0]);
    } catch (error: any) {
        console.error('Error updating cost center:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE Cost Center
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();

        const result = await pool.request()
            .input('id', id)
            .query('DELETE FROM EBM.CostCenters WHERE Id = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Cost Center not found' });
        }

        res.status(204).send();
    } catch (error: any) {
        console.error('Error deleting cost center:', error);

        // Handle foreign key constraint violations
        if (error.message.includes('REFERENCE constraint')) {
            return res.status(400).json({
                error: 'Cannot delete this cost center because it is referenced by other records.'
            });
        }

        res.status(500).json({ error: error.message });
    }
});

export default router;
