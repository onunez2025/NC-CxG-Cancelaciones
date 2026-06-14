import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';
import { invalidateBudgetCache } from './crossReference.js';

const router = Router();

// GET all Budgets
router.get('/', async (req: Request, res: Response) => {
    try {
        const { year, management_id, cost_center_id } = req.query;
        const pool = await getDbConnection();

        let baseQuery = `
            SELECT 
                b.Id as id,
                b.Year as year,
                b.AccountId as account_id,
                b.ManagementId as management_id,
                b.CostCenterId as cost_center_id,
                b.Total as total,
                b.CreatedBy as created_by,
                b.CreatedAt as created_at
            FROM EBM.Budgets b
            WHERE 1=1
        `;

        const request = pool.request();

        if (year) {
            baseQuery += ` AND b.Year = @year`;
            request.input('year', year);
        }
        if (management_id) {
            baseQuery += ` AND b.ManagementId = @management_id`;
            request.input('management_id', management_id);
        }
        if (cost_center_id) {
            baseQuery += ` AND b.CostCenterId = @cost_center_id`;
            request.input('cost_center_id', cost_center_id);
        }

        const result = await request.query(baseQuery);
        const budgets = result.recordset;

        if (budgets.length === 0) {
            return res.json([]);
        }

        const budgetIds = budgets.map(b => b.id);
        const placeholders = budgetIds.map((_, i) => `@p${i}`).join(',');

        const monthsRequest = pool.request();
        budgetIds.forEach((id, i) => monthsRequest.input(`p${i}`, id));

        const monthsResult = await monthsRequest.query(`
            SELECT BudgetId, MonthIndex, Amount 
            FROM EBM.BudgetMonths 
            WHERE BudgetId IN (${placeholders})
            ORDER BY MonthIndex ASC
        `);

        // Group months by budgetId
        interface BudgetMonthRow { BudgetId: string; MonthIndex: number; Amount: number; }
        const monthsMap: Record<string, number[]> = {};
        monthsResult.recordset.forEach((row: BudgetMonthRow) => {
            if (!monthsMap[row.BudgetId]) {
                monthsMap[row.BudgetId] = Array(12).fill(0);
            }
            monthsMap[row.BudgetId][row.MonthIndex] = Number(row.Amount) || 0;
        });

        // Map back to budgets
        interface BudgetRow { id: string; [key: string]: unknown; }
        const finalBudgets = budgets.map((b: BudgetRow) => ({
            ...b,
            monthly_amounts: monthsMap[b.id] || Array(12).fill(0)
        }));

        res.json(finalBudgets);
    } catch (error: unknown) {
        console.error('Error fetching budgets:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// POST new Budget
router.post('/', async (req: Request, res: Response) => {
    try {
        // created_by should ideally come from auth context, here it's passed or null
        const { year, account_id, management_id, cost_center_id, total, created_by, monthly_amounts } = req.body;

        if (!year || !account_id || !management_id || !cost_center_id || !monthly_amounts) {
            return res.status(400).json({ error: 'Year, account, management, cost center, and monthly amounts are required' });
        }

        const pool = await getDbConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Insert Budget Header
            const budgetResult = await transaction.request()
                .input('year', year)
                .input('accountId', account_id)
                .input('managementId', management_id)
                .input('costCenterId', cost_center_id)
                .input('total', total)
                .input('createdBy', created_by || null)
                .query(`
                    INSERT INTO EBM.Budgets (Id, Year, AccountId, ManagementId, CostCenterId, Total, CreatedBy, CreatedAt)
                    OUTPUT INSERTED.Id as id, INSERTED.Year as year, INSERTED.AccountId as account_id,
                           INSERTED.ManagementId as management_id, INSERTED.CostCenterId as cost_center_id,
                           INSERTED.Total as total, INSERTED.CreatedBy as created_by, INSERTED.CreatedAt as created_at
                    VALUES (NEWID(), @year, @accountId, @managementId, @costCenterId, @total, @createdBy, GETDATE())
                `);

            const newBudget = budgetResult.recordset[0];

            // 2. Insert Budget Months
            if (Array.isArray(monthly_amounts) && monthly_amounts.length === 12) {
                const request = transaction.request();
                request.input('budgetId', newBudget.id);
                for (let i = 0; i < 12; i++) {
                    request.input(`m${i}`, monthly_amounts[i] || 0);
                }
                await request.query(`
                    INSERT INTO EBM.BudgetMonths (BudgetId, MonthIndex, Amount)
                    VALUES 
                    (@budgetId, 0, @m0),
                    (@budgetId, 1, @m1),
                    (@budgetId, 2, @m2),
                    (@budgetId, 3, @m3),
                    (@budgetId, 4, @m4),
                    (@budgetId, 5, @m5),
                    (@budgetId, 6, @m6),
                    (@budgetId, 7, @m7),
                    (@budgetId, 8, @m8),
                    (@budgetId, 9, @m9),
                    (@budgetId, 10, @m10),
                    (@budgetId, 11, @m11)
                `);
            }

            await transaction.commit();
            invalidateBudgetCache();
            res.status(201).json({ ...newBudget, monthly_amounts: monthly_amounts });
        } catch (trxError) {
            await transaction.rollback();
            throw trxError;
        }

    } catch (error: unknown) {
        console.error('Error creating budget:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// PUT update Budget
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const budgetId = req.params.id;
        const { year, account_id, management_id, cost_center_id, total, monthly_amounts } = req.body;

        const pool = await getDbConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Update Header
            const budgetResult = await transaction.request()
                .input('id', budgetId)
                .input('year', year)
                .input('accountId', account_id)
                .input('managementId', management_id)
                .input('costCenterId', cost_center_id)
                .input('total', total)
                .query(`
                    UPDATE EBM.Budgets 
                    SET Year = @year, AccountId = @accountId, ManagementId = @managementId, 
                        CostCenterId = @costCenterId, Total = @total
                    OUTPUT INSERTED.Id as id, INSERTED.Year as year, INSERTED.AccountId as account_id,
                           INSERTED.ManagementId as management_id, INSERTED.CostCenterId as cost_center_id,
                           INSERTED.Total as total, INSERTED.CreatedBy as created_by, INSERTED.CreatedAt as created_at
                    WHERE Id = @id
                `);

            if (budgetResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Budget not found' });
            }

            const updatedBudget = budgetResult.recordset[0];

            // 2. Refresh Months (Delete and re-insert)
            await transaction.request()
                .input('budgetId', budgetId)
                .query(`DELETE FROM EBM.BudgetMonths WHERE BudgetId = @budgetId`);

            if (Array.isArray(monthly_amounts) && monthly_amounts.length === 12) {
                const request = transaction.request();
                request.input('budgetId', budgetId);
                for (let i = 0; i < 12; i++) {
                    request.input(`m${i}`, monthly_amounts[i] || 0);
                }
                await request.query(`
                    INSERT INTO EBM.BudgetMonths (BudgetId, MonthIndex, Amount)
                    VALUES 
                    (@budgetId, 0, @m0),
                    (@budgetId, 1, @m1),
                    (@budgetId, 2, @m2),
                    (@budgetId, 3, @m3),
                    (@budgetId, 4, @m4),
                    (@budgetId, 5, @m5),
                    (@budgetId, 6, @m6),
                    (@budgetId, 7, @m7),
                    (@budgetId, 8, @m8),
                    (@budgetId, 9, @m9),
                    (@budgetId, 10, @m10),
                    (@budgetId, 11, @m11)
                `);
            }

            await transaction.commit();
            invalidateBudgetCache();
            res.json({ ...updatedBudget, monthly_amounts });
        } catch (trxError) {
            await transaction.rollback();
            throw trxError;
        }
    } catch (error: unknown) {
        console.error('Error updating budget:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// DELETE Bulk Budgets for Year and Management
router.delete('/bulk/:year/:managementId', async (req: Request, res: Response) => {
    try {
        const year = parseInt(req.params.year);
        const managementId = req.params.managementId;

        const pool = await getDbConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Delete Months (FK constraint)
            await transaction.request()
                .input('year', year)
                .input('managementId', managementId)
                .query(`
                    DELETE m
                    FROM EBM.BudgetMonths m
                    INNER JOIN EBM.Budgets b ON m.BudgetId = b.Id
                    WHERE b.Year = @year AND b.ManagementId = @managementId
                `);

            // 2. Delete Headers
            await transaction.request()
                .input('year', year)
                .input('managementId', managementId)
                .query(`DELETE FROM EBM.Budgets WHERE Year = @year AND ManagementId = @managementId`);

            await transaction.commit();
            invalidateBudgetCache();
            res.status(204).send();
        } catch (trxError) {
            await transaction.rollback();
            throw trxError;
        }
    } catch (error: unknown) {
        console.error('Error bulk deleting budgets:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// DELETE Budget
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const budgetId = req.params.id;
        const pool = await getDbConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Delete Months (FK constraint)
            await transaction.request()
                .input('id', budgetId)
                .query(`DELETE FROM EBM.BudgetMonths WHERE BudgetId = @id`);

            // 2. Delete Header
            const result = await transaction.request()
                .input('id', budgetId)
                .query(`DELETE FROM EBM.Budgets WHERE Id = @id`);

            if (result.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Budget not found' });
            }

            await transaction.commit();
            invalidateBudgetCache();
            res.status(204).send();
        } catch (trxError) {
            await transaction.rollback();
            throw trxError;
        }
    } catch (error: unknown) {
        console.error('Error deleting budget:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

export default router;
