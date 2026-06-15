import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import { addInput, sql } from '../lib/db.js';

const router = Router();

// GET all Managements
router.get('/', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query('SELECT Id as id, Name as name, Code as code FROM EBM.Managements');
        res.json(result.recordset);
    } catch (error: unknown) {
        console.error('Error fetching managements:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// POST new Management
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, code } = req.body;
        if (!name || !code) {
            return res.status(400).json({ error: 'Name and Code are required' });
        }

        const pool = await getDbConnection();
        const r = pool.request();
        addInput(r, 'name', sql.NVarChar(200), name);
        addInput(r, 'code', sql.VarChar(50), code);
        const result = await r.query(`
                INSERT INTO EBM.Managements (Id, Name, Code)
                OUTPUT INSERTED.Id as id, INSERTED.Name as name, INSERTED.Code as code
                VALUES (NEWID(), @name, @code)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (error: unknown) {
        console.error('Error creating management:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// PUT update Management
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, code } = req.body;

        if (!name || !code) {
            return res.status(400).json({ error: 'Name and Code are required' });
        }

        const pool = await getDbConnection();
        const r = pool.request();
        addInput(r, 'id', sql.UniqueIdentifier, id);
        addInput(r, 'name', sql.NVarChar(200), name);
        addInput(r, 'code', sql.VarChar(50), code);
        const result = await r.query(`
                UPDATE EBM.Managements
                SET Name = @name, Code = @code
                OUTPUT INSERTED.Id as id, INSERTED.Name as name, INSERTED.Code as code
                WHERE Id = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Management not found' });
        }

        res.json(result.recordset[0]);
    } catch (error: unknown) {
        console.error('Error updating management:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// DELETE Management
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();

        const r = pool.request();
        addInput(r, 'id', sql.UniqueIdentifier, id);
        const result = await r.query('DELETE FROM EBM.Managements WHERE Id = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Management not found' });
        }

        res.status(204).send();
    } catch (error: unknown) {
        console.error('Error deleting management:', error);

        // Handle foreign key constraint violations
        if (error.message.includes('REFERENCE constraint')) {
            return res.status(400).json({
                error: 'Cannot delete this management because it is referenced by other records.'
            });
        }

        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

export default router;
