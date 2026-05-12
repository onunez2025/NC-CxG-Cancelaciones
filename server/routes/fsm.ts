import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';

const router = Router();

// ─────────────────────────────────────────────
// FSM: Tracking (JOIN with RANGO_HORARIO)
// ─────────────────────────────────────────────

router.get('/tracking', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const ticket = (req.query.ticket as string || '').trim();
        const cliente = (req.query.cliente as string || '').trim();
        const documento = (req.query.documento as string || '').trim();
        const tecnico = (req.query.tecnico as string || '').trim();
        const celular = (req.query.celular as string || '').trim();
        const limit = parseInt(req.query.limit as string) || 100;

        // Logic: if specific ID filters (ticket/doc) are provided, allow historical search.
        // If technician, client or phone are used, keep the "Today" (Peru Time) restriction.
        let whereClause = "WHERE CAST(t.FechaVisita AT TIME ZONE 'UTC' AT TIME ZONE 'SA Pacific Standard Time' AS DATE) = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATE)"; 
        
        if (ticket || documento) {
            whereClause = "WHERE 1=1";
        }

        if (ticket) whereClause += " AND t.Ticket LIKE @ticket";
        if (cliente) whereClause += " AND t.NombreCliente LIKE @cliente";
        if (documento) whereClause += " AND t.CodigoExternoCliente LIKE @documento";
        if (tecnico) whereClause += " AND (t.NombreTecnico LIKE @tecnico OR t.ApellidoTecnico LIKE @tecnico)";
        if (celular) whereClause += " AND (t.Celular1 LIKE @celular OR t.Celular2 LIKE @celular)";

        const query = `
            WITH LatestRango AS (
                SELECT 
                    ID_Ticket,
                    Rango_horario,
                    Orden_atención,
                    Comentario,
                    Creado_el,
                    ROW_NUMBER() OVER(PARTITION BY ID_Ticket ORDER BY Creado_el DESC) as rn
                FROM [dbo].[GAC_APP_TB_RANGO_HORARIO]
            )
            SELECT TOP (@limit)
                t.Ticket as ticket,
                t.NombreCliente as cliente,
                t.CodigoExternoCliente as doc_cliente,
                t.Distrito as distrito,
                t.Ciudad as ciudad,
                ISNULL(t.NombreTecnico, '') + ' ' + ISNULL(t.ApellidoTecnico, '') as tecnico,
                t.BloqueHorario as bloque_original,
                lr.Rango_horario as rango_asignado,
                lr.Orden_atención as orden,
                lr.Comentario as comentario_horario,
                t.FechaVisita as fecha_visita,
                t.Estado as estado,
                -- New detail fields
                t.Calle as calle,
                t.NumeroCalle as numero_calle,
                t.Referencia as referencia,
                t.NombreEquipo as equipo,
                t.CodigoExternoEquipo as cod_equipo,
                t.IdEquipo as id_equipo,
                t.Email as email,
                t.Celular1 as celular1,
                t.Celular2 as celular2,
                t.ComentarioProgramador as coment_prog,
                t.ComentarioTecnico as coment_tecnico,
                ts.Descripcion as tipo_servicio,
                e.DsSupervisor as supervisor
            FROM [SIATC].[Dashboard_FSM] t
            LEFT JOIN LatestRango lr ON TRIM(t.Ticket) = TRIM(lr.ID_Ticket) AND lr.rn = 1
            LEFT JOIN [SIATC].[FSM_TipoServicio] ts ON t.IdServicio = ts.Id
            OUTER APPLY (
                SELECT TOP 1 DsSupervisor 
                FROM [SAP].[FSM_TBL_EMPRESA] 
                WHERE (ISNULL(t.NombreTecnico, '') + ' ' + ISNULL(t.ApellidoTecnico, '')) LIKE DsPrefijoTecnico + '%'
                AND DsPrefijoTecnico != ''
            ) e
            ${whereClause}
            ORDER BY 
                t.FechaVisita DESC, 
                CASE WHEN lr.Rango_horario IS NULL THEN 1 ELSE 0 END,
                ISNULL(lr.Orden_atención, 99999) ASC,
                t.Ticket DESC
        `;

        const request = pool.request();
        if (ticket) request.input('ticket', sql.VarChar, `%${ticket}%`);
        if (cliente) request.input('cliente', sql.VarChar, `%${cliente}%`);
        if (documento) request.input('documento', sql.VarChar, `%${documento}%`);
        if (tecnico) request.input('tecnico', sql.VarChar, `%${tecnico}%`);
        if (celular) request.input('celular', sql.VarChar, `%${celular}%`);
        request.input('limit', sql.Int, limit);

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error: any) {
        console.error('Error fetching FSM tracking:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
