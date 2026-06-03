import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// ─────────────────────────────────────────────
// CATALOGOS
// ─────────────────────────────────────────────

router.get('/catalogos/verificacion', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const results = await pool.request().query(`
            SELECT ID_Emergencia_Verificacion as id, Verificacion as label 
            FROM [dbo].[GAC_APP_TB_EMERGENCIA_VERIFICACION];
            SELECT ID_Emergencia_verificacion_motivo as id, Motivo as motivo, Ref_Verificacion as ref_id
            FROM [dbo].[GAC_APP_TB_EMERGENCIA_VERIFICACION_MOTIVO];
        `);
        res.json({ statuses: results.recordsets[0], motives: results.recordsets[1] });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/catalogos/procesado', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const results = await pool.request().query(`
            SELECT ID_Emergencia_Procesado as id, Procesado as label 
            FROM [dbo].[GAC_APP_TB_EMERGENCIA_PROCESADO];
            SELECT ID_Emergencia_procesado_motivo as id, Motivo as motivo, Procesado as ref_id
            FROM [dbo].[GAC_APP_TB_EMERGENCIA_PROCESADO_MOTIVO];
        `);
        res.json({ statuses: results.recordsets[0], motives: results.recordsets[1] });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// EMERGENCIAS: List (Paginated)
// ─────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const search = req.query.search as string || '';
        const offset = (page - 1) * pageSize;

        const pool = await getDbConnection();

        let whereClause = 'WHERE 1=1';
        if (search) {
            whereClause += ` AND (e.Ticket LIKE @search OR e.Cliente LIKE @search OR e.Tecnico_asignado LIKE @search OR e.Tipo LIKE @search)`;
        }

        // Get total count
        const countResult = await pool.request()
            .input('search', sql.VarChar, `%${search}%`)
            .query(`SELECT COUNT(*) as total FROM [dbo].[GAC_APP_TB_EMERGENCIAS] e ${whereClause}`);
        
        const total = countResult.recordset[0].total;

        const result = await pool.request()
            .input('search', sql.VarChar, `%${search}%`)
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize)
            .query(`
                SELECT 
                    e.ID_Emergencia as id,
                    e.Ticket as ticket,
                    e.Observacion as observacion,
                    ev.Verificacion as verificacion,
                    e.Verificacion_motivo as verificacion_motivo,
                    e.Verificado_el as verificado_el,
                    e.Verificado_por as verificado_por,
                    ep.Procesado as procesado,
                    e.Procesado_motivo as procesado_motivo,
                    e.Proceso_el as proceso_el,
                    e.Procesado_por as procesado_por,
                    e.Creado_el as creado_el,
                    e.Creado_por as creado_por,
                    e.Tipo as tipo,
                    e.Producto as producto,
                    e.Asesor_CC as asesor_cc,
                    e.Tecnico_asignado as tecnico_asignado,
                    e.Cliente as cliente,
                    e.Telefono_1 as telefono_1,
                    e.Telefono_2 as telefono_2,
                    e.Direccion as direccion,
                    e.Direccion_referencia as direccion_referencia,
                    e.Solicitud_repuestos as solicitud_repuestos
                FROM [dbo].[GAC_APP_TB_EMERGENCIAS] e
                LEFT JOIN [dbo].[GAC_APP_TB_EMERGENCIA_VERIFICACION] ev ON e.Verificacion = ev.ID_Emergencia_Verificacion
                LEFT JOIN [dbo].[GAC_APP_TB_EMERGENCIA_PROCESADO] ep ON e.Procesado = ep.ID_Emergencia_Procesado
                ${whereClause}
                ORDER BY e.Creado_el DESC
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
        console.error('Error fetching emergencies:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// EMERGENCIAS: Detail
// ─────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();
        const result = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                SELECT 
                    ID_Emergencia as id, Ticket as ticket, Observacion as observacion,
                    Verificacion as verificacion, Verificacion_motivo as verificacion_motivo,
                    Verificado_el as verificado_el, Verificado_por as verificado_por,
                    Procesado as procesado, Procesado_motivo as procesado_motivo,
                    Proceso_el as proceso_el, Procesado_por as procesado_por,
                    Creado_el as creado_el, Creado_por as creado_por,
                    Tipo as tipo, Producto as producto, Asesor_CC as asesor_cc,
                    Tecnico_asignado as tecnico_asignado, Cliente as cliente,
                    Telefono_1 as telefono_1, Telefono_2 as telefono_2,
                    Direccion as direccion, Direccion_referencia as direccion_referencia,
                    Solicitud_repuestos as solicitud_repuestos
                FROM [dbo].[GAC_APP_TB_EMERGENCIAS] 
                WHERE ID_Emergencia = @id
            `);
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Emergencia no encontrada' });
        }
        res.json(result.recordset[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// EMERGENCIAS: Create
// ─────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
    try {
        const { 
            ticket, tipo, producto, asesor_cc, cliente, 
            telefono_1, telefono_2, direccion, direccion_referencia, 
            observacion, creado_por 
        } = req.body;
        
        const userDisplayName = req.user?.full_name || req.user?.username || creado_por || 'Sistema';

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('ticket', sql.VarChar, ticket)
            .input('tipo', sql.VarChar, tipo)
            .input('producto', sql.VarChar, producto)
            .input('asesor_cc', sql.VarChar, asesor_cc)
            .input('cliente', sql.VarChar, cliente)
            .input('tel1', sql.VarChar, telefono_1)
            .input('tel2', sql.VarChar, telefono_2 || null)
            .input('dir', sql.VarChar, direccion)
            .input('dir_ref', sql.VarChar, direccion_referencia || null)
            .input('obs', sql.VarChar, observacion)
            .input('por', sql.VarChar, userDisplayName)
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_EMERGENCIAS] 
                (ID_Emergencia, Ticket, Tipo, Producto, Asesor_CC, Cliente, Telefono_1, Telefono_2, Direccion, Direccion_referencia, Observacion, Creado_el, Creado_por)
                VALUES (@id, @ticket, @tipo, @producto, @asesor_cc, @cliente, @tel1, @tel2, @dir, @dir_ref, @obs, GETDATE(), @por)
            `);
            
        res.status(201).json({ message: 'Emergencia registrada', id });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// EMERGENCIAS: Asignar Técnico
// ─────────────────────────────────────────────

router.put('/:id/asignar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { tecnico_asignado } = req.body;
        
        const pool = await getDbConnection();
        await pool.request()
            .input('id', sql.VarChar, id)
            .input('tecnico', sql.VarChar, tecnico_asignado)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_EMERGENCIAS] 
                SET Tecnico_asignado = @tecnico
                WHERE ID_Emergencia = @id
            `);
        res.json({ message: 'Técnico asignado' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// EMERGENCIAS: Verificar
// ─────────────────────────────────────────────

router.put('/:id/verificar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { verificacion, motivo, usuario } = req.body;
        
        const pool = await getDbConnection();
        const userDisplayName = req.user?.full_name || req.user?.username || usuario || 'Sistema';

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('verificacion', sql.VarChar, verificacion)
            .input('motivo', sql.VarChar, motivo)
            .input('usuario', sql.VarChar, userDisplayName)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_EMERGENCIAS] 
                SET 
                    Verificacion = @verificacion,
                    Verificacion_motivo = @motivo,
                    Verificado_por = @usuario,
                    Verificado_el = GETDATE()
                WHERE ID_Emergencia = @id
            `);
        res.json({ message: 'Verificación registrada' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// EMERGENCIAS: Procesar (Cierre)
// ─────────────────────────────────────────────

router.put('/:id/procesar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { procesado, motivo, usuario } = req.body;
        
        const pool = await getDbConnection();
        const userDisplayName = req.user?.full_name || req.user?.username || usuario || 'Sistema';

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('procesado', sql.VarChar, procesado)
            .input('motivo', sql.VarChar, motivo)
            .input('usuario', sql.VarChar, userDisplayName)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_EMERGENCIAS] 
                SET 
                    Procesado = @procesado,
                    Procesado_motivo = @motivo,
                    Procesado_por = @usuario,
                    Proceso_el = GETDATE()
                WHERE ID_Emergencia = @id
            `);
        res.json({ message: 'Procesamiento registrado' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// SPARE PARTS: List
// ─────────────────────────────────────────────

router.get('/:id/repuestos', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await getDbConnection();
        const result = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                SELECT sr.*, m.Nombre as material_nombre
                FROM [dbo].[GAC_APP_TB_EMERGENCIAS_SOLICITUD_REPUESTOS] sr
                LEFT JOIN [dbo].[GAC_APP_TB_MATERIALES] m ON sr.ID_Material = m.ID_Material
                WHERE sr.Emergencia = @id
            `);
        res.json(result.recordset);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// SPARE PARTS: Add
// ─────────────────────────────────────────────

router.post('/:id/repuestos', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { material_id, cantidad } = req.body;
        
        const pool = await getDbConnection();
        const solicitudId = Math.random().toString(16).substring(2, 10);

        await pool.request()
            .input('sol_id', sql.VarChar, solicitudId)
            .input('mat_id', sql.VarChar, material_id)
            .input('cant', sql.VarChar, cantidad.toString())
            .input('em_id', sql.VarChar, id)
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_EMERGENCIAS_SOLICITUD_REPUESTOS] 
                (ID_Solicitud, ID_Material, Cantidad, Emergencia)
                VALUES (@sol_id, @mat_id, @cant, @em_id)
            `);
            
        // Update flag in main table
        await pool.request()
            .input('em_id', sql.VarChar, id)
            .query(`UPDATE [dbo].[GAC_APP_TB_EMERGENCIAS] SET Solicitud_repuestos = 'Si' WHERE ID_Emergencia = @em_id`);

        res.status(201).json({ message: 'Repuesto agregado', id: solicitudId });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
