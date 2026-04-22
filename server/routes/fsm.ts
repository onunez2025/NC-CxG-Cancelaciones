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
        const search = req.query.search as string || '';
        const limit = parseInt(req.query.limit as string) || 100;

        // Filter: Today until 7 days ago
        let whereClause = "WHERE t.FechaVisita >= CAST(DATEADD(day, -7, GETDATE()) AS DATE) AND t.FechaVisita <= CAST(GETDATE() AS DATE)"; 
        if (search) {
            whereClause += " AND (t.Ticket LIKE @search OR t.NombreCliente LIKE @search OR t.NombreTecnico LIKE @search)";
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
                t.Asunto as asunto,
                t.Distrito as distrito,
                t.Ciudad as ciudad,
                ISNULL(t.NombreTecnico, '') + ' ' + ISNULL(t.ApellidoTecnico, '') as tecnico,
                t.BloqueHorario as bloque_original,
                lr.Rango_horario as rango_asignado,
                lr.Orden_atención as orden,
                lr.Comentario as comentario_horario,
                t.FechaVisita as fecha_visita,
                t.Estado as estado
            FROM [SIATC].[Dashboard_FSM] t
            LEFT JOIN LatestRango lr ON t.Ticket = lr.ID_Ticket AND lr.rn = 1
            ${whereClause}
            ORDER BY t.FechaVisita DESC, lr.Orden_atención ASC
        `;

        const request = pool.request();
        if (search) {
            request.input('search', sql.VarChar, `%${search}%`);
        }
        request.input('limit', sql.Int, limit);

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error: any) {
        console.error('Error fetching FSM tracking:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
