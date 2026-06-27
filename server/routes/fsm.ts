import { safeError } from '../lib/security.js';
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
        let whereClause = "WHERE t.FechaVisita >= @StartTodayUTC AND t.FechaVisita < @EndTodayUTC"; 
        
        if (ticket || documento) {
            whereClause = "WHERE 1=1";
        }

        if (ticket) whereClause += " AND t.Ticket LIKE @ticket";
        if (cliente) whereClause += " AND t.NombreCliente LIKE @cliente";
        if (documento) whereClause += " AND t.CodigoExternoCliente LIKE @documento";
        if (tecnico) whereClause += " AND (t.NombreTecnico LIKE @tecnico OR t.ApellidoTecnico LIKE @tecnico)";
        if (celular) whereClause += " AND (t.Celular1 LIKE @celular OR t.Celular2 LIKE @celular)";

        const query = `
            DECLARE @TodayPeru DATE = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATE);
            DECLARE @StartTodayUTC DATETIME = CAST(CAST(@TodayPeru AS DATETIME) AT TIME ZONE 'SA Pacific Standard Time' AT TIME ZONE 'UTC' AS DATETIME);
            DECLARE @EndTodayUTC DATETIME = CAST(DATEADD(day, 1, CAST(@TodayPeru AS DATETIME)) AT TIME ZONE 'SA Pacific Standard Time' AT TIME ZONE 'UTC' AS DATETIME);

            WITH TodayTickets AS (
                SELECT 
                    t.Ticket,
                    t.NombreCliente,
                    t.CodigoExternoCliente,
                    t.Distrito,
                    t.Ciudad,
                    t.NombreTecnico,
                    t.ApellidoTecnico,
                    t.BloqueHorario,
                    t.FechaVisita,
                    t.Estado,
                    t.Calle,
                    t.NumeroCalle,
                    t.Referencia,
                    t.NombreEquipo,
                    t.CodigoExternoEquipo,
                    t.IdEquipo,
                    t.Email,
                    t.Celular1,
                    t.Celular2,
                    t.ComentarioProgramador,
                    t.ComentarioTecnico,
                    t.IdServicio
                FROM [SIATC].[Dashboard_FSM] t
                ${whereClause}
            ),
            LatestRango AS (
                SELECT 
                    lr.ID_Ticket,
                    lr.Rango_horario,
                    lr.Orden_atención,
                    lr.Comentario,
                    ROW_NUMBER() OVER(PARTITION BY lr.ID_Ticket ORDER BY lr.Creado_el DESC) as rn
                FROM [dbo].[GAC_APP_TB_RANGO_HORARIO] lr
                WHERE lr.ID_Ticket IN (SELECT Ticket FROM TodayTickets)
            ),
            PagedTickets AS (
                SELECT TOP (@limit)
                    t.*,
                    lr.Rango_horario,
                    lr.Orden_atención,
                    lr.Comentario
                FROM TodayTickets t
                LEFT JOIN LatestRango lr ON t.Ticket = lr.ID_Ticket AND lr.rn = 1
                ORDER BY 
                    t.FechaVisita DESC, 
                    CASE WHEN lr.Rango_horario IS NULL THEN 1 ELSE 0 END,
                    ISNULL(lr.Orden_atención, 99999) ASC,
                    t.Ticket DESC
            )
            SELECT 
                p.Ticket as ticket,
                p.NombreCliente as cliente,
                p.CodigoExternoCliente as doc_cliente,
                p.Distrito as distrito,
                p.Ciudad as ciudad,
                ISNULL(p.NombreTecnico, '') + ' ' + ISNULL(p.ApellidoTecnico, '') as tecnico,
                p.BloqueHorario as bloque_original,
                p.Rango_horario as rango_asignado,
                p.Orden_atención as orden,
                p.Comentario as comentario_horario,
                p.FechaVisita as fecha_visita,
                p.Estado as estado,
                p.Calle as calle,
                p.NumeroCalle as numero_calle,
                p.Referencia as referencia,
                p.NombreEquipo as equipo,
                p.CodigoExternoEquipo as cod_equipo,
                p.IdEquipo as id_equipo,
                p.Email as email,
                p.Celular1 as celular1,
                p.Celular2 as celular2,
                p.ComentarioProgramador as coment_prog,
                p.ComentarioTecnico as coment_tecnico,
                ts.Descripcion as tipo_servicio,
                COALESCE(sup_cas.supervisor_nombre, sup_sole.supervisor_nombre, e.DsSupervisor) as supervisor
            FROM PagedTickets p
            LEFT JOIN [SIATC].[FSM_TipoServicio] ts ON p.IdServicio = ts.Id
            -- CAS Supervisor (OUTER APPLY TOP 1 with active priority and historical order)
            OUTER APPLY (
                SELECT TOP 1 e.Nombre_Empleado as supervisor_nombre
                FROM [dbo].[GAC_APP_TB_COLABORADORES_CAS] cas
                INNER JOIN [dbo].[GAC_APP_TB_COLABORADORES_CAS_HISTORIAL_SUPERVISORES] h 
                    ON cas.Id_colaborar = h.Id_colaborar 
                INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON h.Supervisor = e.ID_empleado
                WHERE cas.Nombre_FSM LIKE '%' + LTRIM(RTRIM(ISNULL(p.NombreTecnico, ''))) + '%' 
                  AND cas.Nombre_FSM LIKE '%' + LTRIM(RTRIM(ISNULL(p.ApellidoTecnico, ''))) + '%'
                ORDER BY 
                    CASE WHEN h.Fecha_fin IS NULL OR h.Fecha_fin >= CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END DESC,
                    h.Fecha_inicio DESC,
                    h.Creado_el DESC
            ) sup_cas
            -- SOLE Supervisor (OUTER APPLY TOP 1 with active priority and historical order)
            OUTER APPLY (
                SELECT TOP 1 e.Nombre_Empleado as supervisor_nombre
                FROM [dbo].[GAC_APP_TB_EMPLEADOS_DATOS_ADICIONAL] da
                INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS_INFORMACION_ADICIONAL] ia ON da.Empleado = ia.Empleado
                INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON ia.Jefe_directo = e.ID_empleado
                WHERE (LTRIM(RTRIM(ISNULL(p.NombreTecnico, ''))) + ' ' + LTRIM(RTRIM(ISNULL(p.ApellidoTecnico, '')))) = da.[Nombre SAP]
                ORDER BY 
                    CASE WHEN ia.Fecha_fin IS NULL OR ia.Fecha_fin >= CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END DESC,
                    ia.Fecha_inicio DESC,
                    ia.ID_empleado_info_adi DESC
            ) sup_sole
            -- Prefix fallback
            OUTER APPLY (
                SELECT TOP 1 DsSupervisor 
                FROM [SAP].[FSM_TBL_EMPRESA] 
                WHERE (ISNULL(p.NombreTecnico, '') + ' ' + ISNULL(p.ApellidoTecnico, '')) LIKE DsPrefijoTecnico + '%'
                AND DsPrefijoTecnico != ''
            ) e
            ORDER BY 
                p.FechaVisita DESC, 
                CASE WHEN p.Rango_horario IS NULL THEN 1 ELSE 0 END,
                ISNULL(p.Orden_atención, 99999) ASC,
                p.Ticket DESC
        `;

        const request = pool.request();
        if (ticket) request.input('ticket', sql.VarChar(255), `%${ticket}%`);
        if (cliente) request.input('cliente', sql.VarChar(255), `%${cliente}%`);
        if (documento) request.input('documento', sql.VarChar(255), `%${documento}%`);
        if (tecnico) request.input('tecnico', sql.VarChar(255), `%${tecnico}%`);
        if (celular) request.input('celular', sql.VarChar(255), `%${celular}%`);
        request.input('limit', sql.Int, limit);

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error: unknown) {
        console.error('Error fetching FSM tracking:', error);
        res.status(500).json({ error: safeError(error) });
    }
});

router.get('/equipment-history/:ticket', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const ticket = req.params.ticket;

        if (!ticket) {
            return res.status(400).json({ error: 'Missing ticket' });
        }

        const query = `
            SELECT 
                t2.Ticket as ticket,
                ISNULL(t2.NombreTecnico, '') + ' ' + ISNULL(t2.ApellidoTecnico, '') as tecnico,
                t2.ComentarioTecnico as comentario,
                t2.Estado as estado,
                ts.Descripcion as tipo_servicio,
                t2.FechaVisita as fecha_visita,
                t2.VisitaRealizada as visita_realizada,
                t2.TrabajoRealizado as trabajo_realizado
            FROM [SIATC].[Dashboard_FSM] t1
            INNER JOIN [SIATC].[Dashboard_FSM] t2 ON t1.IdEquipo = t2.IdEquipo AND t1.CodigoExternoEquipo = t2.CodigoExternoEquipo
            LEFT JOIN [SIATC].[FSM_TipoServicio] ts ON t2.IdServicio = ts.Id
            WHERE t1.Ticket = @ticket
            ORDER BY t2.FechaVisita DESC
        `;

        const request = pool.request();
        request.input('ticket', sql.VarChar(255), ticket);

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error: unknown) {
        console.error('Error fetching equipment history:', error);
        res.status(500).json({ error: safeError(error) });
    }
});

// ─────────────────────────────────────────────
// FSM MAPA: Filter options (empresas CAS + tecnicos)
// ─────────────────────────────────────────────

router.get('/mapa/filtros', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const fechaDesde = (req.query.fechaDesde as string || '').trim();
        const fechaHasta = (req.query.fechaHasta as string || '').trim();

        const empresasResult = await pool.request().query(`
            SELECT DISTINCT LTRIM(RTRIM(cas_tb.Nombre_CAS)) as empresa
            FROM [dbo].[GAC_APP_TB_COLABORADORES_CAS] colab
            INNER JOIN [dbo].[GAC_APP_TB_CAS] cas_tb ON colab.CAS = cas_tb.ID_CAS
            WHERE cas_tb.Nombre_CAS IS NOT NULL AND LTRIM(RTRIM(cas_tb.Nombre_CAS)) <> ''
            ORDER BY empresa ASC
        `);

        let tecnicosQuery = `
            SELECT DISTINCT
                LTRIM(RTRIM(ISNULL(NombreTecnico, '') + ' ' + ISNULL(ApellidoTecnico, ''))) as tecnico
            FROM [SIATC].[Dashboard_FSM]
            WHERE ISNULL(NombreTecnico, '') <> ''
        `;
        const tecnicosReq = pool.request();
        if (fechaDesde && fechaHasta) {
            tecnicosQuery += ' AND FechaVisita >= @fechaDesde AND FechaVisita < DATEADD(day, 1, CAST(@fechaHasta AS DATE))';
            tecnicosReq.input('fechaDesde', sql.Date, fechaDesde);
            tecnicosReq.input('fechaHasta', sql.Date, fechaHasta);
        }
        tecnicosQuery += ' ORDER BY tecnico ASC';
        const tecnicosResult = await tecnicosReq.query(tecnicosQuery);

        res.json({
            empresas: empresasResult.recordset.map((r: { empresa: string }) => r.empresa),
            tecnicos: tecnicosResult.recordset.map((r: { tecnico: string }) => r.tecnico).filter(Boolean),
        });
    } catch (error: unknown) {
        console.error('Error fetching FSM mapa filtros:', error);
        res.status(500).json({ error: safeError(error) });
    }
});

// ─────────────────────────────────────────────
// FSM MAPA: Servicios geolocalizados
// ─────────────────────────────────────────────

router.get('/mapa', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const empresaCas = (req.query.empresaCas as string || '').trim();
        const tecnico    = (req.query.tecnico    as string || '').trim();
        const fechaDesde = (req.query.fechaDesde as string || '').trim();
        const fechaHasta = (req.query.fechaHasta as string || '').trim();

        const request = pool.request();

        let dateFilter: string;
        if (fechaDesde && fechaHasta) {
            dateFilter = 'AND t.FechaVisita >= @fechaDesde AND t.FechaVisita < DATEADD(day, 1, CAST(@fechaHasta AS DATE))';
            request.input('fechaDesde', sql.Date, fechaDesde);
            request.input('fechaHasta', sql.Date, fechaHasta);
        } else {
            // Default: today in Peru time
            dateFilter = `
                AND t.FechaVisita >= CAST(CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATE) AS DATETIME)
                AND t.FechaVisita <  DATEADD(day, 1, CAST(CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATE) AS DATETIME))
            `;
        }

        let tecnicoFilter = '';
        if (tecnico) {
            tecnicoFilter = `AND LTRIM(RTRIM(ISNULL(t.NombreTecnico, '') + ' ' + ISNULL(t.ApellidoTecnico, ''))) = @tecnico`;
            request.input('tecnico', sql.NVarChar(500), tecnico);
        }

        request.input('empresaCas', sql.NVarChar(255), empresaCas);

        const query = `
            WITH ServiciosMapa AS (
                SELECT
                    t.Ticket                                                                              AS ticket,
                    t.NombreCliente                                                                       AS cliente,
                    LTRIM(RTRIM(ISNULL(t.NombreTecnico, '') + ' ' + ISNULL(t.ApellidoTecnico, '')))      AS tecnico,
                    t.FechaVisita                                                                         AS fecha_visita,
                    t.Estado                                                                              AS estado,
                    t.Distrito                                                                            AS distrito,
                    LTRIM(RTRIM(ISNULL(t.Calle, '') + ISNULL(' ' + t.NumeroCalle, '')))                  AS direccion,
                    TRY_CAST(t.Latitud  AS FLOAT)                                                        AS latitud,
                    TRY_CAST(t.Longitud AS FLOAT)                                                        AS longitud,
                    emp_cas.empresa
                FROM [SIATC].[Dashboard_FSM] t
                OUTER APPLY (
                    SELECT TOP 1 LTRIM(RTRIM(cas_tb.Nombre_CAS)) AS empresa
                    FROM [dbo].[GAC_APP_TB_COLABORADORES_CAS] colab
                    INNER JOIN [dbo].[GAC_APP_TB_CAS] cas_tb ON colab.CAS = cas_tb.ID_CAS
                    WHERE colab.Nombre_FSM LIKE '%' + LTRIM(RTRIM(ISNULL(t.NombreTecnico, ''))) + '%'
                      AND colab.Nombre_FSM LIKE '%' + LTRIM(RTRIM(ISNULL(t.ApellidoTecnico, ''))) + '%'
                      AND (ISNULL(t.NombreTecnico, '') <> '' OR ISNULL(t.ApellidoTecnico, '') <> '')
                ) emp_cas
                WHERE TRY_CAST(t.Latitud  AS FLOAT) IS NOT NULL
                  AND TRY_CAST(t.Longitud AS FLOAT) IS NOT NULL
                  ${dateFilter}
                  ${tecnicoFilter}
            )
            SELECT * FROM ServiciosMapa
            WHERE (
                @empresaCas = ''
                OR (@empresaCas = 'SOLE'  AND empresa IS NULL)
                OR empresa = @empresaCas
            )
            ORDER BY fecha_visita DESC
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error: unknown) {
        console.error('Error fetching FSM mapa data:', error);
        res.status(500).json({ error: safeError(error) });
    }
});

export default router;
