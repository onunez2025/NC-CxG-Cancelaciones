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
        const ticket = req.query.ticket as string || '';
        const cliente = req.query.cliente as string || '';
        const documento = req.query.documento as string || '';
        const tecnico = req.query.tecnico as string || '';
        const limit = parseInt(req.query.limit as string) || 100;

        // Default Filter: Strictly TODAY
        let whereClause = "WHERE CAST(t.FechaVisita AS DATE) = CAST(GETDATE() AS DATE)"; 
        
        // If filters are provided, we allow searching regardless of the "Today" restriction 
        // OR we can make them cumulative. Usually user wants to find a specific ticket even if it's not today.
        // Let's make it: if there's any specific filter (ticket/doc/etc), remove the Today restriction to allow lookup.
        if (ticket || cliente || documento || tecnico) {
            whereClause = "WHERE 1=1";
            if (ticket) whereClause += " AND t.Ticket LIKE @ticket";
            if (cliente) whereClause += " AND t.NombreCliente LIKE @cliente";
            if (documento) whereClause += " AND t.CodigoExternoCliente LIKE @documento";
            if (tecnico) whereClause += " AND (t.NombreTecnico LIKE @tecnico OR t.ApellidoTecnico LIKE @tecnico)";
        }

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
                t.ComentarioTecnico as coment_tecnico
            FROM [SIATC].[Dashboard_FSM] t
            LEFT JOIN LatestRango lr ON TRIM(t.Ticket) = TRIM(lr.ID_Ticket) AND lr.rn = 1
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
        request.input('limit', sql.Int, limit);

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error: any) {
        console.error('Error fetching FSM tracking:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
