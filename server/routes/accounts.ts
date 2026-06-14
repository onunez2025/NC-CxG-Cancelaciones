import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';

const router = Router();

// GET all Accounts
router.get('/', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT 
                Id as id,
                Code as code,
                Name as name,
                Category as category,
                CAST(IsActive AS BIT) as is_active
            FROM EBM.AccountingAccounts
        `);
        res.json(result.recordset);
    } catch (error: unknown) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// POST new Account
router.post('/', async (req: Request, res: Response) => {
    try {
        const { code, name, category, is_active = true } = req.body;

        if (!code || !name || !category) {
            return res.status(400).json({ error: 'Code, Name, and Category are required' });
        }

        const pool = await getDbConnection();
        const result = await pool.request()
            .input('code', code)
            .input('name', name)
            .input('category', category)
            .input('isActive', is_active ? 1 : 0)
            .query(`
                INSERT INTO EBM.AccountingAccounts (Id, Code, Name, Category, IsActive)
                OUTPUT INSERTED.Id as id, INSERTED.Code as code, INSERTED.Name as name, 
                       INSERTED.Category as category, CAST(INSERTED.IsActive AS BIT) as is_active
                VALUES (NEWID(), @code, @name, @category, @isActive)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (error: unknown) {
        console.error('Error creating account:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

export default router;
