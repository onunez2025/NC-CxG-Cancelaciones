import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';
import { getAuthenticatedUserDisplayName } from '../utils/user.js';

const router = Router();

/**
 * @route GET /api/special-cases/motivos
 * @desc Get all special case motives
 */
router.get('/motivos', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT ID_Casos_Especiales_Motivo as id, Motivo as motivo, Tipo_de_Usuario as tipo_usuario
            FROM [dbo].[GAC_APP_TB_CASOS_ESPECIALES_MOTIVOS]
            ORDER BY Motivo ASC
        `);
        res.json(result.recordset);
    } catch (error: unknown) {
        console.error('Error fetching special case motives:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

/**
 * @route GET /api/special-cases
 * @desc Get all special cases with pagination and search
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const search = req.query.search as string || '';
        const offset = (page - 1) * pageSize;

        const pool = await getDbConnection();

        let whereClause = 'WHERE 1=1';
        const request = pool.request();
        
        if (search) {
            whereClause += ` AND (n.Ticket LIKE @search OR n.Motivo_solicitud LIKE @search OR n.Comentario LIKE @search OR n.Creado_por LIKE @search)`;
            request.input('search', sql.VarChar, `%${search}%`);
        }

        // Get total count
        const countResult = await pool.request()
            .input('search', sql.VarChar, `%${search}%`)
            .query(`
                SELECT COUNT(*) as total 
                FROM [dbo].[GAC_APP_TB_CASOS_ESPECIALES] n
                ${whereClause}
            `);
        
        const total = countResult.recordset[0].total;

        const result = await request
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize)
            .query(`
                SELECT 
                    n.ID_Casos_Especiales as id,
                    n.Ticket as ticket,
                    n.Motivo_solicitud as motivo,
                    n.Comentario as comentario,
                    n.Creado_el as fecha,
                    COALESCE(u_creador.FullName, n.Creado_por) as creado_por,
                    n.Estado as estado,
                    n.Reviisado_el as revisado_el,
                    n.Revisado_por as revisado_por,
                    n.Motivo_Rechazo as motivo_rechazo,
                    t.FechaVisita as fecha_visita,
                    t.Estado as service_status,
                    t.CodigoExternoEquipo as codigo_producto,
                    t.NombreEquipo as producto
                FROM [dbo].[GAC_APP_TB_CASOS_ESPECIALES] n
                LEFT JOIN [EBM].[Users] u_creador ON u_creador.Username = n.Creado_por
                LEFT JOIN [SIATC].[Dashboard_FSM] t ON n.Ticket = t.Ticket
                ${whereClause}
                ORDER BY n.Creado_el DESC
                OFFSET @offset ROWS
                FETCH NEXT @pageSize ROWS ONLY
            `);

        res.json({
            data: result.recordset,
            total,
            page,
            pageSize
        });
    } catch (error: unknown) {
        console.error('Error fetching special cases:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

/**
 * @route POST /api/special-cases
 * @desc Create a new special case
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { ticket, motivo, comentario, usuario } = req.body;
        const pool = await getDbConnection();
        const id = `CE-${Date.now()}`;

        if (!ticket || !motivo) {
            return res.status(400).json({ error: 'Ticket y Motivo son requeridos' });
        }

        const userDisplayName = await getAuthenticatedUserDisplayName(req, usuario);

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('ticket', sql.VarChar, ticket)
            .input('motivo', sql.VarChar, motivo)
            .input('comentario', sql.VarChar, comentario || '')
            .input('usuario', sql.VarChar, userDisplayName)
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_CASOS_ESPECIALES] 
                (ID_Casos_Especiales, Ticket, Motivo_solicitud, Comentario, Creado_el, Creado_por, Estado)
                VALUES (@id, @ticket, @motivo, @comentario, GETDATE(), @usuario, 'PENDIENTE')
            `);

        res.status(201).json({ message: 'Caso especial registrado', id });
    } catch (error: unknown) {
        console.error('Error creating special case:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

/**
 * @route POST /api/special-cases/:id/status
 * @desc Update the status of a special case (Approve/Reject)
 */
router.post('/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { estado, revisado_por, motivo_rechazo } = req.body;
        const pool = await getDbConnection();

        const revisor = req.user?.full_name || req.user?.username || revisado_por;

        if (!estado || !revisor) {
            return res.status(400).json({ error: 'Estado y revisado_por son requeridos' });
        }

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('estado', sql.VarChar, estado)
            .input('revisado_por', sql.VarChar, revisor)
            .input('motivo_rechazo', sql.VarChar, motivo_rechazo || null)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CASOS_ESPECIALES]
                SET 
                    Estado = @estado,
                    Revisado_por = @revisado_por,
                    Reviisado_el = GETDATE(),
                    Motivo_Rechazo = @motivo_rechazo
                WHERE ID_Casos_Especiales = @id
            `);

        res.json({ message: 'Estado del caso especial actualizado' });
    } catch (error: unknown) {
        console.error('Error updating special case status:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

export default router;
