import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// ─────────────────────────────────────────────
// SHARED: Ticket Lookup
// ─────────────────────────────────────────────

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
                    Asunto as asunto,
                    Estado as estado,
                    ComentarioProgramador as motivo_elevacion,
                    IDEmpresa as lugar_compra_id,
                    FechaVisita as fecha_visita
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

// ─────────────────────────────────────────────
// CANCELACIONES: Motivos (must be before :id)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// CANCELACIONES: Detail
// ─────────────────────────────────────────────

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
                    c.Apro_Solicitud,
                    c.Apro_Obs,
                    c.Apro_Por,
                    c.Apro_El,
                    c.Vali_Cliente,
                    c.Vali_Obs,
                    c.Vali_Por,
                    c.Vali_El,
                    c.Vali_Motivo_Real as vali_motivo_real,
                    c.Estado_Proceso as estado
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

// ─────────────────────────────────────────────
// CANCELACIONES: List (Paginated)
// ─────────────────────────────────────────────

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
            whereClause += ` AND (c.Gestionado IS NULL OR c.Gestionado = '') AND c.Asignado_a IS NULL`;
        } else if (estado === 'EN GESTION') {
            whereClause += ` AND (c.Gestionado = 'No' OR (c.Asignado_a IS NOT NULL AND (c.Gestionado IS NULL OR c.Gestionado = '')))`;
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
                    c.Estado_Proceso as estado,
                    c.Apro_Solicitud as apro_solicitud,
                    c.Apro_Obs as apro_obs,
                    c.Apro_Por as apro_por,
                    c.Apro_El as apro_el,
                    c.Vali_Cliente as vali_cliente,
                    c.Vali_Obs as vali_obs,
                    c.Vali_Por as vali_por,
                    c.Vali_El as vali_el,
                    c.Vali_Motivo_Real as vali_motivo_real
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

// ─────────────────────────────────────────────
// CXG/NC: Motivos (must be before :id routes)
// ─────────────────────────────────────────────

router.get('/cxg-nc/motivos', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT ID_motivo_CxG_NC as id, Tipo as motivo 
            FROM [dbo].[GAC_APP_TB_HISTOTIAL_APROB_CXG_NC_MOTIVOS]
            ORDER BY Tipo ASC
        `);
        res.json(result.recordset);
    } catch (error: any) {
        console.error('Error fetching CxG/NC motives:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CXG/NC: List (Paginated)
// ─────────────────────────────────────────────

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
                    n.Asignado_a,
                    n.Asignado_por,
                    n.Asignado_el,
                    n.Gestionado,
                    n.Observacion_Gestionado as observacion,
                    n.Estado_Proceso as estado,
                    n.Apro_Solicitud as apro_solicitud,
                    n.Apro_Por as apro_por,
                    n.Apro_El as apro_el,
                    n.Apro_Obs as apro_obs,
                    n.Vali_Cliente as vali_cliente,
                    n.Vali_Por as vali_por,
                    n.Vali_El as vali_el,
                    n.Vali_Motivo_Real as vali_motivo_real,
                    n.Aprobado as aprobado,
                    n.Aprobado_motivo as aprobado_motivo,
                    n.Aprobado_observacion as aprobado_observacion,
                    n.Aprobado_el as aprobado_el,
                    n.Aprobado_por as aprobado_por
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

// ─────────────────────────────────────────────
// CXG/NC: Historial for a solicitud
// ─────────────────────────────────────────────

router.get('/cxg-nc/:id/historial', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();
        const result = await pool.request()
            .input('solicitud', sql.VarChar, id)
            .query(`
                SELECT 
                    ID_Historial_Apro_CxG_NC as id,
                    Solicitud as solicitud,
                    Tipo as tipo,
                    Observacion as observacion,
                    Creado_el as fecha,
                    Creado_por as usuario
                FROM [dbo].[GAC_APP_TB_HISTOTIAL_APROB_CXG_NC]
                WHERE Solicitud = @solicitud
                ORDER BY Creado_el ASC
            `);
        res.json(result.recordset);
    } catch (error: any) {
        console.error('Error fetching historial:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CXG/NC: Detail
// ─────────────────────────────────────────────

router.get('/cxg-nc/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();
        const result = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                SELECT 
                    n.ID_Apro_CxG_NC as id,
                    n.Tipo as tipo,
                    n.Ticket as correlativo,
                    n.Creado_el as fecha,
                    n.Creado_por as creado_por,
                    n.Tienda as cliente,
                    n.Observacion as observacion_inicial,
                    n.Asignado_a,
                    n.Asignado_por,
                    n.Asignado_el,
                    n.Gestionado,
                    n.Observacion_Gestionado as observacion,
                    n.Estado_Proceso as estado,
                    n.Vali_Cliente as vali_cliente,
                    n.Vali_Obs as vali_obs,
                    n.Vali_Por as vali_por,
                    n.Vali_El as vali_el,
                    n.Apro_Solicitud as apro_solicitud,
                    n.Apro_Obs as apro_obs,
                    n.Apro_Por as apro_por,
                    n.Apro_El as apro_el,
                    n.Vali_Motivo_Real as vali_motivo_real,
                    n.Aprobado as aprobado,
                    n.Aprobado_motivo as aprobado_motivo,
                    n.Aprobado_observacion as aprobado_observacion,
                    n.Aprobado_el as aprobado_el,
                    n.Aprobado_por as aprobado_por,
                    n.Procesado as procesado,
                    n.Procesado_motivo as procesado_motivo,
                    n.Procesado_observacion as procesado_observacion,
                    n.Procesado_el as procesado_el,
                    n.Procesado_por as procesado_por,
                    n.Ticket_desinstalacion as ticket_desinstalacion,
                    n.Gestionado_el as fecha_gestionado,
                    n.Ticket as ticket,
                    t.NombreCliente as fsm_cliente,
                    t.ComentarioProgramador as fsm_motivo_elevacion,
                    t.IDEmpresa as fsm_lugar_compra
                FROM [dbo].[GAC_APP_TB_CXG_NC] n
                LEFT JOIN [SIATC].[Dashboard_FSM] t ON n.Ticket = t.Ticket
                WHERE n.ID_Apro_CxG_NC = @id
            `);
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'No se encontró la solicitud CxG/NC' });
        }
        res.json(result.recordset[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CANCELACIONES: Create
// ─────────────────────────────────────────────

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
                (ID_Cancelados, Ticket, Motivo_Cancelacion, Autorizador_Cancelacion, Generado_el, Estado_Proceso)
                VALUES (@id, @ticket, @motivo, @autorizador, GETDATE(), 'REGISTRADO')
            `);
            
        res.status(201).json({ message: 'Cancelación registrada', id });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CANCELACIONES: Gestionar
// ─────────────────────────────────────────────

router.post('/cancelaciones/:id/gestionar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { 
            cancelacion_correcta,
            motivo_correcto,
            observacion,
            gestionado_por,
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
                    Gestionado_el = GETDATE(),
                    Estado_Proceso = 'CERRADO'
                WHERE ID_Cancelados = @id
            `);
        res.json({ message: 'Cancelación gestionada correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CANCELACIONES: Asignar
// ─────────────────────────────────────────────

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
                    Asignado_el = GETDATE(),
                    Gestionado = 'No',
                    Estado_Proceso = 'ASIGNADO'
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

// ─────────────────────────────────────────────
// CXG/NC: Create + History entry
// ─────────────────────────────────────────────

router.post('/cxg-nc', async (req: Request, res: Response) => {
    try {
        const { tipo, cliente, ticket, observacion } = req.body;
        const pool = await getDbConnection();
        const solicitudId = `CNC-${Date.now()}`;
        const histId = Math.random().toString(16).substring(2, 10).toUpperCase();
        
        await pool.request()
            .input('id', sql.VarChar, solicitudId)
            .input('ticket', sql.VarChar, ticket || 'MT-TK-TEMP')
            .input('tipo', sql.VarChar, tipo)
            .input('tienda', sql.VarChar, cliente)
            .input('observacion', sql.VarChar, observacion || '')
            .input('usuario', sql.VarChar, req.body.usuario || 'Sistema')
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_CXG_NC] 
                (ID_Apro_CxG_NC, Ticket, Tipo, Tienda, Observacion, Creado_el, Creado_por, Procesado, Estado_Proceso)
                VALUES (@id, @ticket, @tipo, @tienda, @observacion, GETDATE(), @usuario, 'NO', 'REGISTRADO')
            `);

        // Insert history entry
        await pool.request()
            .input('histId', sql.VarChar, histId)
            .input('solicitud', sql.VarChar, solicitudId)
            .input('tipo', sql.VarChar, 'Registro')
            .input('obs', sql.VarChar, observacion || `Solicitud de ${tipo} registrada para ${cliente}`)
            .input('usuario', sql.VarChar, req.body.usuario || 'Sistema')
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_HISTOTIAL_APROB_CXG_NC]
                (ID_Historial_Apro_CxG_NC, Solicitud, Tipo, Observacion, Creado_el, Creado_por)
                VALUES (@histId, @solicitud, @tipo, @obs, GETDATE(), @usuario)
            `);
            
        res.status(201).json({ message: 'Solicitud CxG/NC registrada', id: solicitudId });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CXG/NC: Aprobar Solicitud (Supervisor) + History
// ─────────────────────────────────────────────

router.post('/cxg-nc/:id/aprobar-solicitud', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { aprobado, motivo, observacion, usuario } = req.body;
        const pool = await getDbConnection();
        const histId = Math.random().toString(16).substring(2, 10).toUpperCase();

        // Update main table
        await pool.request()
            .input('id', sql.VarChar, id)
            .input('aprobado', sql.VarChar, aprobado) // 'APROBADO' | 'RECHAZADO'
            .input('motivo', sql.VarChar, motivo || null)
            .input('obs', sql.VarChar, observacion || '')
            .input('por', sql.VarChar, usuario || '')
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CXG_NC] 
                SET 
                    Apro_Solicitud = @aprobado,
                    Apro_Obs = @obs,
                    Apro_Por = @por,
                    Apro_El = GETDATE(),
                    Aprobado = @aprobado,
                    Aprobado_motivo = @motivo,
                    Aprobado_observacion = @obs,
                    Aprobado_por = @por,
                    Aprobado_el = GETDATE(),
                    Estado_Proceso = CASE WHEN @aprobado = 'APROBADO' THEN 'APROBADO_SUP' ELSE 'RECHAZADO' END
                WHERE ID_Apro_CxG_NC = @id
            `);

        // Insert history entry
        await pool.request()
            .input('histId', sql.VarChar, histId)
            .input('solicitud', sql.VarChar, id)
            .input('tipo', sql.VarChar, 'Aprobación')
            .input('obs', sql.VarChar, `${aprobado}${motivo ? ' — Motivo: ' + motivo : ''}${observacion ? ' — ' + observacion : ''}`)
            .input('usuario', sql.VarChar, usuario || '')
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_HISTOTIAL_APROB_CXG_NC]
                (ID_Historial_Apro_CxG_NC, Solicitud, Tipo, Observacion, Creado_el, Creado_por)
                VALUES (@histId, @solicitud, @tipo, @obs, GETDATE(), @usuario)
            `);

        res.json({ message: 'Solicitud evaluada correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CXG/NC: Asignar + History
// ─────────────────────────────────────────────

router.post('/cxg-nc/:id/asignar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { asignado_a, asignado_por, asignado_nombre } = req.body;
        const pool = await getDbConnection();
        const histId = Math.random().toString(16).substring(2, 10).toUpperCase();

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('asignado_a', sql.VarChar, asignado_a)
            .input('asignado_por', sql.VarChar, asignado_por)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CXG_NC] 
                SET Asignado_a = @asignado_a, Asignado_por = @asignado_por, Asignado_el = GETDATE(), 
                    Gestionado = 'No', Estado_Proceso = 'ASIGNADO'
                WHERE ID_Apro_CxG_NC = @id
            `);

        // Insert history entry
        await pool.request()
            .input('histId', sql.VarChar, histId)
            .input('solicitud', sql.VarChar, id)
            .input('tipo', sql.VarChar, 'Asignación')
            .input('obs', sql.VarChar, `Asignado a: ${asignado_nombre || asignado_a}`)
            .input('usuario', sql.VarChar, asignado_por || '')
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_HISTOTIAL_APROB_CXG_NC]
                (ID_Historial_Apro_CxG_NC, Solicitud, Tipo, Observacion, Creado_el, Creado_por)
                VALUES (@histId, @solicitud, @tipo, @obs, GETDATE(), @usuario)
            `);

        res.json({ message: 'Solicitud asignada correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CXG/NC: Gestionar (Cierre) + History
// ─────────────────────────────────────────────

router.post('/cxg-nc/:id/gestionar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { observacion, gestionado_por, resultado } = req.body;
        const pool = await getDbConnection();
        const histId = Math.random().toString(16).substring(2, 10).toUpperCase();

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('observacion', sql.VarChar, observacion || '')
            .input('gestionado_por', sql.VarChar, gestionado_por || '')
            .input('resultado', sql.VarChar, resultado || 'Si')
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CXG_NC] 
                SET Procesado = 'SI', Procesado_el = GETDATE(), Procesado_por = @gestionado_por, 
                    Procesado_observacion = @observacion,
                    Observacion_Gestionado = @observacion, Gestionado = @resultado, Gestionado_el = GETDATE(),
                    Estado_Proceso = CASE WHEN @resultado = 'Si' THEN 'CERRADO' ELSE 'RECHAZADO' END
                WHERE ID_Apro_CxG_NC = @id
            `);

        // Insert history entry
        await pool.request()
            .input('histId', sql.VarChar, histId)
            .input('solicitud', sql.VarChar, id)
            .input('tipo', sql.VarChar, 'Gestión')
            .input('obs', sql.VarChar, `${resultado === 'Si' ? 'PROCESADO' : 'RECHAZADO'} — ${observacion || ''}`)
            .input('usuario', sql.VarChar, gestionado_por || '')
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_HISTOTIAL_APROB_CXG_NC]
                (ID_Historial_Apro_CxG_NC, Solicitud, Tipo, Observacion, Creado_el, Creado_por)
                VALUES (@histId, @solicitud, @tipo, @obs, GETDATE(), @usuario)
            `);

        res.json({ message: 'Solicitud procesada correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CANCELACIONES: Aprobar Solicitud (Supervisor)
// ─────────────────────────────────────────────

router.post('/cancelaciones/:id/aprobar-solicitud', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { aprobado, observacion, usuario } = req.body;
        const pool = await getDbConnection();
        await pool.request()
            .input('id', sql.VarChar, id)
            .input('aprobado', sql.VarChar, aprobado)
            .input('obs', sql.VarChar, observacion || '')
            .input('por', sql.VarChar, usuario || '')
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CANCELACIONES] 
                SET 
                    Apro_Solicitud = @aprobado,
                    Apro_Obs = @obs,
                    Apro_Por = @por,
                    Apro_El = GETDATE(),
                    Estado_Proceso = CASE WHEN @aprobado = 'APROBADO' THEN 'APROBADO_SUP' ELSE 'CERRADO' END
                WHERE ID_Cancelados = @id
            `);
        res.json({ message: 'Solicitud evaluada correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CANCELACIONES: Validar Cliente
// ─────────────────────────────────────────────

router.post('/cancelaciones/:id/validar-cliente', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { resultado, observacion, usuario, motivo_real } = req.body;
        const pool = await getDbConnection();
        await pool.request()
            .input('id', sql.VarChar, id)
            .input('resultado', sql.VarChar, resultado)
            .input('obs', sql.VarChar, observacion || '')
            .input('por', sql.VarChar, usuario || '')
            .input('motivo_real', sql.VarChar, motivo_real || null)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CANCELACIONES] 
                SET 
                    Vali_Cliente = @resultado,
                    Vali_Obs = @obs,
                    Vali_Por = @por,
                    Vali_El = GETDATE(),
                    Vali_Motivo_Real = @motivo_real,
                    Estado_Proceso = 'VALIDADO'
                WHERE ID_Cancelados = @id
            `);
        res.json({ message: 'Validación de cliente registrada' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CXG/NC: Validar Cliente + History
// ─────────────────────────────────────────────

router.post('/cxg-nc/:id/validar-cliente', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { resultado, observacion, usuario, motivo_real } = req.body;
        const pool = await getDbConnection();
        const histId = Math.random().toString(16).substring(2, 10).toUpperCase();

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('resultado', sql.VarChar, resultado)
            .input('obs', sql.VarChar, observacion || '')
            .input('por', sql.VarChar, usuario || '')
            .input('motivo_real', sql.VarChar, motivo_real || null)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CXG_NC] 
                SET 
                    Vali_Cliente = @resultado,
                    Vali_Obs = @obs,
                    Vali_Por = @por,
                    Vali_El = GETDATE(),
                    Vali_Motivo_Real = @motivo_real,
                    Estado_Proceso = 'VALIDADO'
                WHERE ID_Apro_CxG_NC = @id
            `);

        // Insert history entry
        await pool.request()
            .input('histId', sql.VarChar, histId)
            .input('solicitud', sql.VarChar, id)
            .input('tipo', sql.VarChar, 'Validación')
            .input('obs', sql.VarChar, `${resultado}${motivo_real ? ' — Motivo Real: ' + motivo_real : ''}${observacion ? ' — ' + observacion : ''}`)
            .input('usuario', sql.VarChar, usuario || '')
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_HISTOTIAL_APROB_CXG_NC]
                (ID_Historial_Apro_CxG_NC, Solicitud, Tipo, Observacion, Creado_el, Creado_por)
                VALUES (@histId, @solicitud, @tipo, @obs, GETDATE(), @usuario)
            `);

        res.json({ message: 'Validación de cliente registrada' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
