import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';
import { verifyPermission } from '../middleware/auth.js';
import { getAuthenticatedUserDisplayName } from '../utils/user.js';

const router = Router();

// GET all supervisor programs (Read-only)
router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;
        const search = (req.query.search as string || '').toLowerCase();
        const sortBy = req.query.sortBy as string || 'fecha_labor';
        const sortOrder = (req.query.sortOrder as string || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        // Filters
        const empleadoId = req.query.empleadoId as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        const pool = await getDbConnection();
        const request = pool.request();

        let whereClause = "WHERE 1=1";
        if (search) {
            whereClause += " AND (LOWER(e.Nombre_Empleado) LIKE @search OR LOWER(l.Labor) LIKE @search)";
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        if (empleadoId) {
            whereClause += " AND l.Empleado = @empleadoId";
            request.input('empleadoId', sql.VarChar, empleadoId);
        }
        if (startDate) {
            whereClause += " AND l.Fecha_Labor >= @startDate";
            request.input('startDate', sql.Date, startDate);
        }
        if (endDate) {
            whereClause += " AND l.Fecha_Labor <= @endDate";
            request.input('endDate', sql.Date, endDate);
        }

        const orderColumn = sortBy === 'empleado_name' ? 'e.Nombre_Empleado' : 'l.Fecha_Labor';

        request.input('offset', sql.Int, offset).input('limit', sql.Int, limit);

        // 1. Total Count
        const countResult = await request.query(`
            SELECT COUNT(*) as total 
            FROM [dbo].[GAC_APP_TB_EMPLEADOS_CALENDARIO_LABORES] l
            LEFT JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON l.Empleado = e.ID_empleado
            ${whereClause}
        `);
        const total = countResult.recordset[0].total;

        // 2. Data
        const result = await request.query(`
            SELECT 
                l.[ID_empleado_calendario_labores] as id,
                l.Empleado as empleado_id,
                ISNULL(e.Nombre_Empleado, 'SIN NOMBRE (' + l.Empleado + ')') as empleado_name,
                e.Estado as empleado_estado,
                e.Subarea as empleado_subarea,
                e.Puesto as empleado_role,
                CONVERT(VARCHAR, l.Fecha_Labor, 23) as fecha_labor,
                l.Labor as labor,
                l.Creado_por as creado_por,
                CONVERT(VARCHAR, l.Creado_el, 120) as creado_el,
                l.Modificado_por as modificado_por,
                CONVERT(VARCHAR, l.Modificado_el, 120) as modificado_el
            FROM [dbo].[GAC_APP_TB_EMPLEADOS_CALENDARIO_LABORES] l
            LEFT JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON l.Empleado = e.ID_empleado
            ${whereClause}
            ORDER BY ${orderColumn} ${sortOrder}
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        res.json({
            data: result.recordset,
            metadata: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error('Error fetching supervisor schedules:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET all labor colors (Read-only)
router.get('/colores', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT 
                Labor as labor,
                Color_Fondo as color_fondo,
                Color_Texto as color_text
            FROM [dbo].[GAC_APP_TB_PROGRAMA_SUPERVISORES_LABORES_COLORES]
        `);
        res.json(result.recordset);
    } catch (error: any) {
        console.error('Error fetching labor colors:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET all active employees for selection dropdown
router.get('/empleados', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT ID_empleado as Id, Nombre_Empleado, Puesto, Subarea
            FROM [dbo].[GAC_APP_TB_EMPLEADOS]
            WHERE Estado = 'A'
            ORDER BY Nombre_Empleado ASC
        `);
        
        const data = result.recordset.map(emp => ({
            id: emp.Id,
            name: emp.Nombre_Empleado ? emp.Nombre_Empleado.trim() : '',
            role: emp.Puesto,
            subarea: emp.Subarea ? emp.Subarea.trim() : ''
        }));
        
        res.json(data);
    } catch (error: any) {
        console.error('Error fetching employees for dropdown:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST a new supervisor schedule
router.post('/', verifyPermission('cxg.programa_supervisores.create'), async (req: Request, res: Response) => {
    try {
        const { empleado_id, fecha_labor, labor } = req.body;
        const pool = await getDbConnection();
        const id = Math.random().toString(16).substring(2, 10);
        const creadoPor = await getAuthenticatedUserDisplayName(req);

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('empleado', sql.VarChar, empleado_id)
            .input('fecha', sql.Date, fecha_labor)
            .input('labor', sql.VarChar, labor)
            .input('creadoPor', sql.VarChar, creadoPor)
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_EMPLEADOS_CALENDARIO_LABORES] 
                ([ID_empleado_calendario_labores], Empleado, Fecha_Labor, Labor, Creado_por, Creado_el)
                VALUES (@id, @empleado, @fecha, @labor, @creadoPor, GETDATE())
            `);
        
        res.status(201).json({ id });
    } catch (error: any) {
        console.error('Error creating supervisor schedule:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT (update) an existing supervisor schedule
router.put('/:id', verifyPermission('cxg.programa_supervisores.edit'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { empleado_id, fecha_labor, labor } = req.body;
        const pool = await getDbConnection();
        const modificadoPor = await getAuthenticatedUserDisplayName(req);

        const result = await pool.request()
            .input('id', sql.VarChar, id)
            .input('empleado', sql.VarChar, empleado_id)
            .input('fecha', sql.Date, fecha_labor)
            .input('labor', sql.VarChar, labor)
            .input('modificadoPor', sql.VarChar, modificadoPor)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_EMPLEADOS_CALENDARIO_LABORES]
                SET Empleado = @empleado, Fecha_Labor = @fecha, Labor = @labor,
                    Modificado_por = @modificadoPor, Modificado_el = GETDATE()
                WHERE [ID_empleado_calendario_labores] = @id
            `);
        
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Registro no encontrado' });
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error updating supervisor schedule:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE a supervisor schedule
router.delete('/:id', verifyPermission('cxg.programa_supervisores.delete'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();
        const result = await pool.request()
            .input('id', sql.VarChar, id)
            .query('DELETE FROM [dbo].[GAC_APP_TB_EMPLEADOS_CALENDARIO_LABORES] WHERE [ID_empleado_calendario_labores] = @id');
        
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Registro no encontrado' });
        res.status(204).send();
    } catch (error: any) {
        console.error('Error deleting supervisor schedule:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
