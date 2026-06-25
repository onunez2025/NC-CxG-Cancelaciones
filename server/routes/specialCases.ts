import { safeError } from '../lib/security.js';
import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';
import { getAuthenticatedUserDisplayName } from '../utils/user.js';

const router = Router();

const BASE_JOINS = `
    FROM [dbo].[GAC_APP_TB_CASOS_ESPECIALES] n
    LEFT JOIN [EBM].[Users] u_creador ON u_creador.Username = n.Creado_por
    LEFT JOIN [SIATC].[Dashboard_FSM] t ON n.Ticket = t.Ticket
`;

const FILTER_MAP: Record<string, string> = {
    ticket:         'n.Ticket',
    motivo:         'n.Motivo_solicitud',
    creado_por:     'COALESCE(u_creador.FullName, n.Creado_por)',
    estado:         'n.Estado',
    service_status: 't.Estado',
    fecha:          'n.Creado_el',
    fecha_visita:   't.FechaVisita',
};

const SORT_MAP: Record<string, string> = {
    ticket:         'n.Ticket',
    motivo:         'n.Motivo_solicitud',
    creado_por:     'COALESCE(u_creador.FullName, n.Creado_por)',
    fecha:          'n.Creado_el',
    fecha_visita:   't.FechaVisita',
    estado:         'n.Estado',
    service_status: 't.Estado',
};

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
        res.status(500).json({ error: safeError(error) });
    }
});

router.get('/unique-values', async (req: Request, res: Response) => {
    try {
        const column = req.query.column as string;
        const search = (req.query.search as string) || '';

        const dbCol = FILTER_MAP[column];
        if (!dbCol || column === 'fecha' || column === 'fecha_visita') {
            return res.status(400).json({ error: 'Columna no válida para valores únicos' });
        }

        const pool = await getDbConnection();
        const request = pool.request();

        let whereClause = `WHERE ${dbCol} IS NOT NULL AND ${dbCol} <> ''`;
        if (search) {
            whereClause += ` AND ${dbCol} LIKE @search`;
            request.input('search', sql.VarChar(255), `%${search}%`);
        }

        const result = await request.query(`
            SELECT DISTINCT TOP 50 ${dbCol} as value
            ${BASE_JOINS}
            ${whereClause}
            ORDER BY value ASC
        `);
        res.json(result.recordset.map((r: { value: string }) => r.value));
    } catch (error: unknown) {
        res.status(500).json({ error: safeError(error) });
    }
});

router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const search = (req.query.search as string) || '';
        const sortBy = req.query.sortBy as string || 'fecha';
        const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const offset = (page - 1) * pageSize;

        const sortCol = SORT_MAP[sortBy] ?? 'n.Creado_el';

        // Parse dynamic filters from query params
        type DynFilter = { col: string; val: string; type: 'date' | 'string'; op: 'gte' | 'lte' | 'eq' };
        const dynamicFilters: DynFilter[] = [];

        for (const key in req.query) {
            if (!key.startsWith('filter_')) continue;
            const colKey = key.replace('filter_', '');

            if (colKey.endsWith('_start') || colKey.endsWith('_end')) {
                const baseKey = colKey.replace(/_(start|end)$/, '');
                const dbCol = FILTER_MAP[baseKey];
                const value = req.query[key] as string;
                if (dbCol && value) {
                    dynamicFilters.push({ col: dbCol, val: value, type: 'date', op: colKey.endsWith('_start') ? 'gte' : 'lte' });
                }
                continue;
            }

            const dbCol = FILTER_MAP[colKey];
            const value = req.query[key] as string;
            if (dbCol && value) {
                value.split(',').map(v => v.trim()).filter(Boolean).forEach(v => {
                    dynamicFilters.push({ col: dbCol, val: v, type: 'string', op: 'eq' });
                });
            }
        }

        // Group filters by column
        const strFiltersByCol: Record<string, string[]> = {};
        const dateFilters: DynFilter[] = [];
        dynamicFilters.forEach(f => {
            if (f.type === 'date') { dateFilters.push(f); }
            else { (strFiltersByCol[f.col] = strFiltersByCol[f.col] || []).push(f.val); }
        });

        // Build WHERE
        let where = 'WHERE 1=1';
        if (search) {
            where += ` AND (n.Ticket LIKE @search OR n.Motivo_solicitud LIKE @search OR n.Comentario LIKE @search OR n.Creado_por LIKE @search)`;
        }
        let dateIdx = 0;
        dateFilters.forEach(f => {
            where += f.op === 'gte'
                ? ` AND CAST(${f.col} AS DATE) >= @fdate${dateIdx}`
                : ` AND CAST(${f.col} AS DATE) <= @fdate${dateIdx}`;
            dateIdx++;
        });
        let strIdx = 0;
        for (const [col, vals] of Object.entries(strFiltersByCol)) {
            if (vals.length === 1) {
                where += ` AND ${col} = @fstr${strIdx}`;
                strIdx++;
            } else {
                const inParams = vals.map((_, vi) => `@fstr${strIdx + vi}`).join(', ');
                where += ` AND ${col} IN (${inParams})`;
                strIdx += vals.length;
            }
        }

        const pool = await getDbConnection();

        // Helper to bind all params to a request
        const bindParams = (req: ReturnType<typeof pool.request>) => {
            if (search) req.input('search', sql.VarChar(255), `%${search}%`);
            let di = 0, si = 0;
            dateFilters.forEach(f => req.input(`fdate${di++}`, sql.Date, f.val));
            for (const vals of Object.values(strFiltersByCol)) {
                vals.forEach(v => req.input(`fstr${si++}`, sql.VarChar(255), v));
            }
        };

        const countReq = pool.request();
        bindParams(countReq);
        const countResult = await countReq.query(`SELECT COUNT(*) as total ${BASE_JOINS} ${where}`);
        const total = countResult.recordset[0].total;

        const dataReq = pool.request();
        bindParams(dataReq);
        dataReq.input('offset', sql.Int, offset);
        dataReq.input('pageSize', sql.Int, pageSize);

        const result = await dataReq.query(`
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
            ${BASE_JOINS}
            ${where}
            ORDER BY ${sortCol} ${sortOrder}
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
        `);

        res.json({ data: result.recordset, total, page, pageSize });
    } catch (error: unknown) {
        res.status(500).json({ error: safeError(error) });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const { ticket, motivo, comentario, usuario } = req.body;

        if (!ticket || !motivo) {
            return res.status(400).json({ error: 'Ticket y Motivo son requeridos' });
        }

        const pool = await getDbConnection();
        const id = `CE-${Date.now()}`;
        const userDisplayName = await getAuthenticatedUserDisplayName(req, usuario);

        await pool.request()
            .input('id', sql.VarChar(255), id)
            .input('ticket', sql.VarChar(255), ticket)
            .input('motivo', sql.VarChar(255), motivo)
            .input('comentario', sql.NVarChar(sql.MAX), comentario || '')
            .input('usuario', sql.VarChar(255), userDisplayName)
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_CASOS_ESPECIALES]
                (ID_Casos_Especiales, Ticket, Motivo_solicitud, Comentario, Creado_el, Creado_por, Estado)
                VALUES (@id, @ticket, @motivo, @comentario, GETDATE(), @usuario, 'PENDIENTE')
            `);

        res.status(201).json({ message: 'Caso especial registrado', id });
    } catch (error: unknown) {
        res.status(500).json({ error: safeError(error) });
    }
});

router.post('/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { estado, revisado_por, motivo_rechazo } = req.body;

        const revisor = req.user?.full_name || req.user?.username || revisado_por;
        if (!estado || !revisor) {
            return res.status(400).json({ error: 'Estado y revisado_por son requeridos' });
        }

        const pool = await getDbConnection();
        await pool.request()
            .input('id', sql.VarChar(255), id)
            .input('estado', sql.VarChar(255), estado)
            .input('revisado_por', sql.VarChar(255), revisor)
            .input('motivo_rechazo', sql.NVarChar(sql.MAX), motivo_rechazo || null)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CASOS_ESPECIALES]
                SET Estado = @estado, Revisado_por = @revisado_por,
                    Reviisado_el = GETDATE(), Motivo_Rechazo = @motivo_rechazo
                WHERE ID_Casos_Especiales = @id
            `);

        res.json({ message: 'Estado del caso especial actualizado' });
    } catch (error: unknown) {
        res.status(500).json({ error: safeError(error) });
    }
});

export default router;
