import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// GET Ticket details (Lookup)
router.get('/tickets/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();
        const result = await pool.request()
            .input('ticketId', sql.VarChar, id)
            .query(`
                SELECT TOP 1
                    Ticket as ticket,
                    NombreCliente as cliente,
                    NombreEquipo as producto,
                    Asunto as asunto
                FROM [SIATC].[Dashboard_FSM]
                WHERE Ticket = @ticketId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        res.json(result.recordset[0]);
    } catch (error: any) {
        console.error('Error lookup ticket:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET Cancellation Motives
router.get('/cancelaciones/motivos', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT ID_Cancelados_motivo as id, Motivo as motivo 
            FROM [dbo].[GAC_APP_TB_CANCELACIONES_MOTIVOS]
            ORDER BY Motivo ASC
        `);
        res.json(result.recordset);
    } catch (error: any) {
        console.error('Error fetching motives:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET single Cancelacion detail
router.get('/cancelaciones/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();
        const result = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                SELECT 
                    c.ID_Cancelados as id,
                    c.Ticket as ticket,
                    c.Motivo_Cancelacion as motivo_cancelacion_id,
                    m.Motivo as motivo_cancelacion_texto,
                    c.Autorizador_Cancelacion as autorizador,
                    c.Generado_el as fecha_generado,
                    c.Gestionado_por as gestionado_por,
                    c.Cancelacion_Correcta as cancelacion_correcta,
                    c.Motivo_Correcto as motivo_correcto_id,
                    mc.Motivo as motivo_correcto_texto,
                    c.Gestionado as gestionado,
                    c.Observacion_Gestionado as observacion,
                    c.Gestionado_el as fecha_gestionado,
                    c.Asignado_a as asignado_a,
                    c.Asignado_por as asignado_por,
                    c.Asignado_el as fecha_asignado,
                    ISNULL(t.NombreCliente, '') as cliente,
                    ISNULL(t.NombreEquipo, '') as producto,
                    ISNULL(t.Asunto, '') as asunto,
                    CASE 
                        WHEN c.Gestionado = 'Si' AND c.Cancelacion_Correcta = 'Si' THEN 'APROBADO'
                        WHEN c.Gestionado = 'Si' AND c.Cancelacion_Correcta = 'No' THEN 'RECHAZADO'
                        WHEN c.Gestionado = 'No' THEN 'EN GESTIÓN'
                        ELSE 'PENDIENTE'
                    END as estado
                FROM [dbo].[GAC_APP_TB_CANCELACIONES] c
                LEFT JOIN [SIATC].[Dashboard_FSM] t ON c.Ticket = t.Ticket
                LEFT JOIN [dbo].[GAC_APP_TB_CANCELACIONES_MOTIVOS] m ON c.Motivo_Cancelacion = m.ID_Cancelados_motivo
                LEFT JOIN [dbo].[GAC_APP_TB_CANCELACIONES_MOTIVOS] mc ON c.Motivo_Correcto = mc.ID_Cancelados_motivo
                WHERE c.ID_Cancelados = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cancelación no encontrada' });
        }

        res.json(result.recordset[0]);
    } catch (error: any) {
        console.error('Error fetching cancellation detail:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET all Cancelaciones (Paginated)
router.get('/cancelaciones', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const search = req.query.search as string || '';
        const estado = req.query.estado as string || '';
        const offset = (page - 1) * pageSize;

        const pool = await getDbConnection();
        
        let whereClause = 'WHERE 1=1';
        if (search) {
            whereClause += ` AND (c.Ticket LIKE @search OR t.NombreCliente LIKE @search OR m.Motivo LIKE @search OR c.Autorizador_Cancelacion LIKE @search)`;
        }
        if (estado === 'PENDIENTE') {
            whereClause += ` AND (c.Gestionado IS NULL OR c.Gestionado = '')`;
        } else if (estado === 'EN GESTION') {
            whereClause += ` AND c.Gestionado = 'No'`;
        } else if (estado === 'APROBADO') {
            whereClause += ` AND c.Gestionado = 'Si' AND c.Cancelacion_Correcta = 'Si'`;
        } else if (estado === 'RECHAZADO') {
            whereClause += ` AND c.Gestionado = 'Si' AND c.Cancelacion_Correcta = 'No'`;
        }

        // Get total count for pagination
        const countResult = await pool.request()
            .input('search', sql.VarChar, `%${search}%`)
            .query(`
                SELECT COUNT(*) as total 
                FROM [dbo].[GAC_APP_TB_CANCELACIONES] c
                LEFT JOIN [SIATC].[Dashboard_FSM] t ON c.Ticket = t.Ticket
                LEFT JOIN [dbo].[GAC_APP_TB_CANCELACIONES_MOTIVOS] m ON c.Motivo_Cancelacion = m.ID_Cancelados_motivo
                ${whereClause}
            `);
        
        const total = countResult.recordset[0].total;

        const result = await pool.request()
            .input('search', sql.VarChar, `%${search}%`)
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize)
            .query(`
                SELECT 
                    c.ID_Cancelados as id,
                    c.Ticket as ticket,
                    c.Motivo_Cancelacion as motivo_cancelacion_id,
                    ISNULL(m.Motivo, c.Motivo_Cancelacion) as motivo,
                    c.Autorizador_Cancelacion as autorizador,
                    c.Generado_el as fecha_generado,
                    c.Gestionado_por as gestionado_por,
                    c.Cancelacion_Correcta as cancelacion_correcta,
                    c.Gestionado as gestionado,
                    c.Observacion_Gestionado as observacion,
                    c.Gestionado_el as fecha_gestionado,
                    c.Asignado_a as asignado_a,
                    c.Asignado_por as asignado_por,
                    c.Asignado_el as fecha_asignado,
                    ISNULL(t.NombreCliente, '') as cliente,
                    CASE 
                        WHEN c.Gestionado = 'Si' AND c.Cancelacion_Correcta = 'Si' THEN 'APROBADO'
                        WHEN c.Gestionado = 'Si' AND c.Cancelacion_Correcta = 'No' THEN 'RECHAZADO'
                        WHEN c.Gestionado = 'No' THEN 'EN GESTIÓN'
                        ELSE 'PENDIENTE'
                    END as estado
                FROM [dbo].[GAC_APP_TB_CANCELACIONES] c
                LEFT JOIN [SIATC].[Dashboard_FSM] t ON c.Ticket = t.Ticket
                LEFT JOIN [dbo].[GAC_APP_TB_CANCELACIONES_MOTIVOS] m ON c.Motivo_Cancelacion = m.ID_Cancelados_motivo
                ${whereClause}
                ORDER BY c.Generado_el DESC
                OFFSET @offset ROWS
                FETCH NEXT @pageSize ROWS ONLY
            `);

        res.json({
            data: result.recordset,
            total,
            page,
            pageSize
        });
    } catch (error: any) {
        console.error('Error fetching cancellations:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET all CxG/NC (Paginated)
router.get('/cxg-nc', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const search = req.query.search as string || '';
        const offset = (page - 1) * pageSize;

        const pool = await getDbConnection();

        let whereClause = 'WHERE 1=1';
        if (search) {
            whereClause += ` AND (n.Ticket LIKE @search OR n.Tienda LIKE @search)`;
        }

        // Get total count
        const countResult = await pool.request()
            .input('search', sql.VarChar, `%${search}%`)
            .query(`SELECT COUNT(*) as total FROM [dbo].[GAC_APP_TB_CXG_NC] n ${whereClause}`);
        
        const total = countResult.recordset[0].total;

        const result = await pool.request()
            .input('search', sql.VarChar, `%${search}%`)
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize)
            .query(`
                SELECT 
                    n.ID_Apro_CxG_NC as id,
                    n.Tipo as tipo,
                    n.Ticket as correlativo,
                    n.Creado_el as fecha,
                    n.Tienda as cliente,
                    CASE WHEN n.Procesado = 'SI' THEN 'PROCESADO' ELSE 'PENDIENTE' END as estado
                FROM [dbo].[GAC_APP_TB_CXG_NC] n
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
    } catch (error: any) {
        console.error('Error fetching CxG/NC:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST Create Cancelacion
router.post('/cancelaciones', async (req: Request, res: Response) => {
    try {
        const { cliente, motive, ticket, observacion, usuario } = req.body;
        const pool = await getDbConnection();
        
        // Generate a short UUID-like ID to match existing format
        const id = Math.random().toString(16).substring(2, 10);

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('ticket', sql.VarChar, ticket || '')
            .input('motivo', sql.VarChar, motive)
            .input('autorizador', sql.VarChar, usuario || 'Sistema')
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_CANCELACIONES] 
                (ID_Cancelados, Ticket, Motivo_Cancelacion, Autorizador_Cancelacion, Generado_el)
                VALUES (@id, @ticket, @motivo, @autorizador, GETDATE())
            `);
            
        res.status(201).json({ message: 'Cancelación registrada', id });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST Gestionar Cancelacion (Approve = Cancelacion Correcta)
router.post('/cancelaciones/:id/gestionar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { 
            cancelacion_correcta, // 'Si' | 'No'
            motivo_correcto,      // ID del motivo correcto (solo si cancelacion_correcta = 'No')
            observacion,          // Observación del gestor
            gestionado_por,       // Nombre del usuario que gestiona
            asignado_a,           // A quién se asigna para seguimiento
            asignado_por          // Quién asigna
        } = req.body;
        
        const pool = await getDbConnection();
        await pool.request()
            .input('id', sql.VarChar, id)
            .input('cancelacion_correcta', sql.VarChar, cancelacion_correcta)
            .input('motivo_correcto', sql.VarChar, motivo_correcto || null)
            .input('observacion', sql.VarChar, observacion || '')
            .input('gestionado_por', sql.VarChar, gestionado_por || '')
            .input('gestionado', sql.VarChar, 'Si')
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CANCELACIONES] 
                SET 
                    Cancelacion_Correcta = @cancelacion_correcta,
                    Motivo_Correcto = @motivo_correcto,
                    Observacion_Gestionado = @observacion,
                    Gestionado_por = @gestionado_por,
                    Gestionado = @gestionado,
                    Gestionado_el = GETDATE()
                WHERE ID_Cancelados = @id
            `);
        res.json({ message: 'Cancelación gestionada correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST Asignar Cancelacion
router.post('/cancelaciones/:id/asignar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { asignado_a, asignado_por } = req.body;
        
        const pool = await getDbConnection();
        await pool.request()
            .input('id', sql.VarChar, id)
            .input('asignado_a', sql.VarChar, asignado_a)
            .input('asignado_por', sql.VarChar, asignado_por)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CANCELACIONES] 
                SET 
                    Asignado_a = @asignado_a,
                    Asignado_por = @asignado_por,
                    Asignado_el = GETDATE()
                WHERE ID_Cancelados = @id
            `);
        res.json({ message: 'Cancelación asignada' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Legacy approve/reject endpoints (mapped to gestionar)
router.post('/cancelaciones/:id/approve', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();
        await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CANCELACIONES] 
                SET Cancelacion_Correcta = 'Si', Gestionado = 'Si', Gestionado_el = GETDATE()
                WHERE ID_Cancelados = @id
            `);
        res.json({ message: 'Cancelación aprobada' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/cancelaciones/:id/reject', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();
        await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CANCELACIONES] 
                SET Cancelacion_Correcta = 'No', Gestionado = 'Si', Gestionado_el = GETDATE()
                WHERE ID_Cancelados = @id
            `);
        res.json({ message: 'Cancelación rechazada' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create CxG/NC
router.post('/cxg-nc', async (req: Request, res: Response) => {
    try {
        const { tipo, cliente, ticket, observacion } = req.body;
        const pool = await getDbConnection();
        
        await pool.request()
            .input('id', sql.VarChar, `CNC-${Date.now()}`)
            .input('ticket', sql.VarChar, ticket || 'MT-TK-TEMP')
            .input('tipo', sql.VarChar, tipo)
            .input('tienda', sql.VarChar, cliente)
            .input('observacion', sql.VarChar, observacion || '')
            .input('usuario', sql.VarChar, req.body.usuario || 'Sistema')
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_CXG_NC] 
                (ID_Apro_CxG_NC, Ticket, Tipo, Tienda, Observacion, Creado_el, Creado_por, Procesado)
                VALUES (@id, @ticket, @tipo, @tienda, @observacion, GETDATE(), @usuario, 'NO')
            `);
            
        res.status(201).json({ message: 'Solicitud CxG/NC registrada' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH Process CxG/NC
router.patch('/cxg-nc/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const pool = await getDbConnection();
        await pool.request()
            .input('id', sql.VarChar, id)
            .input('procesado', sql.VarChar, estado === 'PROCESADO' ? 'SI' : 'NO')
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CXG_NC] 
                SET Procesado = @procesado, Procesado_el = GETDATE()
                WHERE ID_Apro_CxG_NC = @id
            `);
        res.json({ message: 'Estado actualizado' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
