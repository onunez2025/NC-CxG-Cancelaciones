import { Router, Request, Response } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';
import { verifyPermission } from '../middleware/auth.js';

const router = Router();

// Dictionary to map zIDLugarCompra_SDK OData codes to store names
const C4C_STORE_MAPPING: Record<string, string> = {
  "000000000000000000000000000000000000000000000000000000002995": "SODIMAC PERU S.A.",
  "000000000000000000000000000000000000000000000000000000002540": "TIENDAS VARIAS",
  "000000000000000000000000000000000000000000000000000000000003": "IMPORTACIONES HIRAOKA S.A.C.",
  "000000000000000000000000000000000000000000000000000000003381": "CASSINELLI S A",
  "000000000000000000000000000000000000000000000000000000002211": "PROMART - HOMECENTERS PERUANOS S.A.",
  "000000000000000000000000000000000000000000000000000000003005": "MAESTRO - TIENDA DEL MEJORAMIENTO DEL HOGAR S.A.",
  "000000000000000000000000000000000000000000000000000000001836": "TIENDAS PERUANAS SA - OECHSLE",
  "000000000000000000000000000000000000000000000000000000002548": "TIENDAS POR DEPARTAMENTO RIPLEY",
  "000000000000000000000000000000000000000000000000000000002295": "SAGA FALABELLA SA",
  "000000000000000000000000000000000000000000000000000000002444": "HIPERMERCADOS TOTTUS SA",
  "000000000000000000000000000000000000000000000000000000003376": "CASSINELLI - SANIHOLD SAC",
  "000000000000000000000000000000000000000000000000000000003985": "CLIENTE SHOWROOM CALLAO",
  "000000000000000000000000000000000000000000000000000000002907": "COMERCIAL LA COLINA E.I.R.LTDA.",
  "000000000000000000000000000000000000000000000000000000000079": "COMERCIO DIVERSOS ELECTRONIC S.A.C.",
  "000000000000000000000000000000000000000000000000000000002809": "CONSORCIO COMERCIAL UNIVERSAL SA",
  "000000000000000000000000000000000000000000000000000000000251": "CORPORACION DELNORT SOCIEDAD",
  "000000000000000000000000000000000000000000000000000000002271": "CREDISHOP S.A.C.",
  "000000000000000000000000000000000000000000000000000000003793": "CURACAO / EFE - CONECTA RETAIL S.A.",
  "000000000000000000000000000000000000000000000000000000001933": "DECOR CENTER - INVERSIONES CYS S.A.",
  "000000000000000000000000000000000000000000000000000000002340": "DECORACIONES ECONOMICA S.A.C.",
  "000000000000000000000000000000000000000000000000000000003523": "DECORACIONES Y ACABADOS MONTOYA",
  "000000000000000000000000000000000000000000000000000000001334": "DIMCORP INGENIERIA E.I.R.L.",
  "000000000000000000000000000000000000000000000000000000003422": "DISTRIBUCIONES OLANO S.A.C.",
  "000000000000000000000000000000000000000000000000000000002111": "DISTRIBUIDORA ATACHAGUA E.I.R.L.",
  "000000000000000000000000000000000000000000000000000000002206": "DISTRIBUIDORA CIA CERAMICA S.A.C.",
  "000000000000000000000000000000000000000000000000000000001250": "DISTRIBUIDORA E&C EIRL",
  "000000000000000000000000000000000000000000000000000000003360": "DISTRIBUIDORA FERRE IMPORT HM",
  "000000000000000000000000000000000000000000000000000000003319": "DISTRIBUIDORA MUNDO CERAMICO",
  "000000000000000000000000000000000000000000000000000000003446": "D-KASA & DECORACIONES E.I.R.L",
  "000000000000000000000000000000000000000000000000000000001842": "EDELNOR - ENEL DISTRIBUCION PERU S.A.A.",
  "000000000000000000000000000000000000000000000000000000003037": "ELECTROMECANICA FERRICENTER",
  "000000000000000000000000000000000000000000000000000000003943": "ENEL MEGAPLAZA 12 MESES",
  "000000000000000000000000000000000000000000000000000000000450": "ENEL MEGAPLAZA 18 MESES",
  "000000000000000000000000000000000000000000000000000000000446": "ENEL MEGAPLAZA 24 MESES",
  "000000000000000000000000000000000000000000000000000000000444": "ENEL PLAZA NORTE 12 MESE",
  "000000000000000000000000000000000000000000000000000000003978": "TIENDA SOLE CHORRILLOS",
  "000000000000000000000000000000000000000000000000000000003984": "TIENDA SOLE PRINCIPAL",
  "000000000000000000000000000000000000000000000000000000003990": "TIENDA SOLE SANTA ANITA",
  "000000000000000000000000000000000000000000000000000000003983": "TIENDA METUSA MALVINAS",
  "000000000000000000000000000000000000000000000000000000003970": "TIENDA SOLE AREQUIPA",
  "000000000000000000000000000000000000000000000000000000003981": "TIENDA SOLE BELLAVISTA",
  "000000000000000000000000000000000000000000000000000000003993": "TIENDA SOLE BOULEVAR ASIA",
  "000000000000000000000000000000000000000000000000000000003982": "TIENDA SOLE CHIMBOTE",
  "000000000000000000000000000000000000000000000000000000003969": "TIENDA SOLE MALL DEL SUR",
  "000000000000000000000000000000000000000000000000000000003208": "CENTRO CERAMICO LAS FLORES ORIENTE",
  "000000000000000000000000000000000000000000000000000000000970": "CENTRO CERAMICO LAS FLORES SAC."
};

export function resolveStoreDescription(code: string | null | undefined): string {
    if (!code) return 'TIENDAS VARIAS';
    const cleanCode = code.toString().trim();
    
    // Try exact dictionary mapping
    if (C4C_STORE_MAPPING[cleanCode]) {
        return C4C_STORE_MAPPING[cleanCode];
    }
    
    // Try to resolve common FSM/short codes
    if (cleanCode.startsWith('1301') || cleanCode.includes('2995')) {
        return 'SODIMAC PERU S.A.';
    }
    if (cleanCode.startsWith('1303') || cleanCode.includes('2211')) {
        return 'PROMART - HOMECENTERS PERUANOS S.A.';
    }
    if (cleanCode.startsWith('1304') || cleanCode.includes('3005')) {
        return 'MAESTRO - TIENDA DEL MEJORAMIENTO DEL HOGAR S.A.';
    }
    if (cleanCode.startsWith('1305') || cleanCode.includes('3381') || cleanCode.includes('3376')) {
        return 'CASSINELLI S A';
    }
    if (cleanCode.startsWith('1306') || cleanCode.includes('2548')) {
        return 'TIENDAS POR DEPARTAMENTO RIPLEY';
    }
    if (cleanCode.startsWith('1307') || cleanCode.includes('2295')) {
        return 'SAGA FALABELLA SA';
    }
    if (cleanCode.startsWith('1308') || cleanCode.includes('2444')) {
        return 'HIPERMERCADOS TOTTUS SA';
    }
    if (cleanCode.startsWith('1309') || cleanCode.includes('0003')) {
        return 'IMPORTACIONES HIRAOKA S.A.C.';
    }
    if (cleanCode.startsWith('1310') || cleanCode.includes('1836')) {
        return 'TIENDAS PERUANAS SA - OECHSLE';
    }
    
    // Other common FSM retail channels
    if (cleanCode.startsWith('1311')) return 'PLAZA VEA';
    if (cleanCode.startsWith('1312')) return 'ESTILOS';
    if (cleanCode.startsWith('1313')) return 'METRO';
    if (cleanCode.startsWith('1314')) return 'TIENDA PARIS';
    if (cleanCode.startsWith('1315')) return 'TIENDA LA CURACAO';
    if (cleanCode.startsWith('1316')) return 'TIENDA EFE';
    if (cleanCode.startsWith('1317')) return 'TIENDA CARSA';
    if (cleanCode.startsWith('1318')) return 'TIENDA MARCIMEX';

    // If it's already a string description rather than a code, return it
    if (/^[a-zA-Z]/i.test(cleanCode) && cleanCode !== 'null' && cleanCode !== 'undefined') {
        return cleanCode;
    }
    
    return 'TIENDAS VARIAS';
}

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
                    t.Ticket as ticket,
                    t.NombreCliente as cliente,
                    t.NombreEquipo as producto,
                    t.Asunto as asunto,
                    t.Estado as estado,
                    t.ComentarioProgramador as motivo_elevacion,
                    t.IDEmpresa as lugar_compra_id,
                    emp.DsEmpresa as lugar_compra,
                    t.FechaVisita as fecha_visita,
                    t.CodigoExternoCliente as documento_cliente,
                    COALESCE(sup_cas.supervisor_nombre, sup_sole.supervisor_nombre) as supervisor_nombre
                FROM [SIATC].[Dashboard_FSM] t
                LEFT JOIN [SAP].[FSM_TBL_EMPRESA] emp ON t.IDEmpresa = CAST(emp.IdEmpresa as VARCHAR)
                -- CAS Supervisor (OUTER APPLY TOP 1 to avoid fan-out, prioritizing active and sorting historically)
                OUTER APPLY (
                    SELECT TOP 1 e.Nombre_Empleado as supervisor_nombre
                    FROM [dbo].[GAC_APP_TB_COLABORADORES_CAS] cas
                    INNER JOIN [dbo].[GAC_APP_TB_COLABORADORES_CAS_HISTORIAL_SUPERVISORES] h 
                        ON cas.Id_colaborar = h.Id_colaborar 
                    INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON h.Supervisor = e.ID_empleado
                    WHERE cas.Nombre_FSM LIKE '%' + t.NombreTecnico + '%' 
                      AND cas.Nombre_FSM LIKE '%' + t.ApellidoTecnico + '%'
                    ORDER BY 
                        CASE WHEN h.Fecha_fin IS NULL OR h.Fecha_fin >= GETDATE() THEN 1 ELSE 0 END DESC,
                        h.Fecha_inicio DESC,
                        h.Creado_el DESC
                ) sup_cas
                -- SOLE Supervisor (OUTER APPLY TOP 1 to avoid fan-out)
                OUTER APPLY (
                    SELECT TOP 1 e.Nombre_Empleado as supervisor_nombre
                    FROM [dbo].[GAC_APP_TB_EMPLEADOS_DATOS_ADICIONAL] da
                    INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS_INFORMACION_ADICIONAL] ia ON da.Empleado = ia.Empleado
                    INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON ia.Jefe_directo = e.ID_empleado
                    WHERE (t.NombreTecnico + ' ' + t.ApellidoTecnico) = da.[Nombre SAP]
                ) sup_sole
                WHERE t.Ticket = @ticketId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        const ticketData = result.recordset[0];
        let resolvedLugarCompra = null;

        // 1. Query SAP C4C OData for the custom Lugar de Compra field
        const sapBaseUrl = process.env.SAP_BASE_URL || 'https://my361897.crm.ondemand.com/sap/c4c/odata/v1/c4codataapi';
        const sapUser = process.env.SAP_USER || 'oscar.nunez';
        const sapPassword = process.env.SAP_PASSWORD || '9xP6*epfuhWx4rK';

        try {
            const authHeader = 'Basic ' + Buffer.from(`${sapUser}:${sapPassword}`).toString('base64');
            const url = `${sapBaseUrl}/ServiceRequestCollection?$filter=ID eq '${id}'&$format=json`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const body = await response.json() as any;
                const odataResults = body?.d?.results || [];
                if (odataResults.length > 0) {
                    const sdkCode = odataResults[0].zIDLugarCompra_SDK;
                    if (sdkCode) {
                        resolvedLugarCompra = C4C_STORE_MAPPING[sdkCode] || null;
                        if (resolvedLugarCompra) {
                            console.log(`[C4C ODATA SUCCESS] Ticket ${id}: Mapped code "${sdkCode}" to "${resolvedLugarCompra}"`);
                        } else {
                            console.warn(`[C4C ODATA WARN] Ticket ${id}: Code "${sdkCode}" not in mapping dictionary`);
                        }
                    }
                }
            } else {
                console.error(`[C4C ODATA ERROR] Ticket ${id}: Fetch returned status ${response.status}`);
            }
        } catch (odataErr: any) {
            console.error(`[C4C ODATA EXCEPTION] Ticket ${id}:`, odataErr.message);
        }

        // 2. Database Fallback (retrieve resolved tienda from TBL_C4C_REPORTE_CONTROL if OData failed or unmapped)
        if (!resolvedLugarCompra) {
            try {
                const fallbackResult = await pool.request()
                    .input('ticketId', sql.VarChar, id)
                    .query(`
                        SELECT TOP 1 TIENDA
                        FROM [dbo].[TBL_C4C_REPORTE_CONTROL]
                        WHERE NOS = @ticketId AND TIENDA IS NOT NULL AND TIENDA <> ''
                    `);

                if (fallbackResult.recordset.length > 0) {
                    resolvedLugarCompra = fallbackResult.recordset[0].TIENDA;
                    console.log(`[DB FALLBACK SUCCESS] Ticket ${id}: Retrieved tienda "${resolvedLugarCompra}"`);
                }
            } catch (dbErr: any) {
                console.error(`[DB FALLBACK ERROR] Ticket ${id}:`, dbErr.message);
            }
        }

        // 3. Legacy Fallback (CAS Company Name or TIENDAS VARIAS)
        if (!resolvedLugarCompra) {
            resolvedLugarCompra = ticketData.lugar_compra || ticketData.lugar_compra_id || 'TIENDAS VARIAS';
            console.log(`[LEGACY FALLBACK] Ticket ${id}: Defaulted to "${resolvedLugarCompra}"`);
        }

        // Update the returned object with our resolved store name
        ticketData.lugar_compra = resolveStoreDescription(resolvedLugarCompra);

        res.json(ticketData);
    } catch (error: any) {
        console.error('Error lookup ticket:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CANCELACIONES: Motivos (must be before :id)
// ─────────────────────────────────────────────

router.get('/cancelaciones/motivos', verifyPermission('cxg.cancelaciones.view'), async (req: Request, res: Response) => {
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

router.get('/cancelaciones/:id', verifyPermission('cxg.cancelaciones.view'), async (req: Request, res: Response) => {
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

router.get('/cancelaciones', verifyPermission('cxg.cancelaciones.view'), async (req: Request, res: Response) => {
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
                ${search ? 'LEFT JOIN [SIATC].[Dashboard_FSM] t ON c.Ticket = t.Ticket' : ''}
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

router.get('/cxg-nc/motivos', verifyPermission('cxg.cxg_nc.view'), async (req: Request, res: Response) => {
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
// CXG/NC: Unique Values for Autocomplete
// ─────────────────────────────────────────────

router.get('/cxg-nc/unique-values', verifyPermission('cxg.cxg_nc.view'), async (req: Request, res: Response) => {
    try {
        const column = req.query.column as string;
        const search = req.query.search as string || '';
        if (!column) return res.status(400).json({ error: 'Column is required' });

        const columnMap: Record<string, string> = {
            tipo: 'n.Tipo',
            documento: 't.CodigoExternoCliente',
            ticket: 'n.Ticket',
            tienda: 'COALESCE(emp.DsEmpresa, CAST(t.IDEmpresa as VARCHAR))',
            cliente: 'COALESCE(t.NombreCliente, n.Tienda)',
            creado_por: 'n.Creado_por',
            supervisor: 'COALESCE(sup_cas.supervisor_nombre, sup_sole.supervisor_nombre)',
            aprobado: 'n.Aprobado',
            procesado: 'n.Procesado',
            estado: 'CASE WHEN n.Procesado IS NOT NULL AND n.Procesado <> \'\' AND n.Procesado <> \'NO\' THEN \'CERRADO\' WHEN n.Procesado_por IS NOT NULL AND n.Procesado_por <> \'\' THEN \'ASIGNADO\' WHEN n.Aprobado = \'No\' THEN \'RECHAZADO\' WHEN n.Aprobado = \'Si\' THEN \'APROBADO_SUP\' ELSE \'REGISTRADO\' END',
            codigo_producto: 't.CodigoExternoEquipo',
            producto: 't.NombreEquipo'
        };

        const dbCol = columnMap[column];
        if (!dbCol) return res.status(400).json({ error: 'Invalid column' });

        const pool = await getDbConnection();
        const request = pool.request();
        
        let whereClause = `WHERE ${dbCol} IS NOT NULL AND ${dbCol} <> ''`;
        if (search) {
            whereClause += ` AND ${dbCol} LIKE @search`;
            request.input('search', sql.VarChar, `%${search}%`);
        }

        const query = `
            SELECT DISTINCT TOP 50
                ${dbCol} as value
            FROM [dbo].[GAC_APP_TB_CXG_NC] n
            LEFT JOIN [SIATC].[Dashboard_FSM] t ON n.Ticket = t.Ticket
            LEFT JOIN [SAP].[FSM_TBL_EMPRESA] emp ON t.IDEmpresa = CAST(emp.IdEmpresa as VARCHAR)
            -- CAS Supervisor
            OUTER APPLY (
                SELECT TOP 1 e.Nombre_Empleado as supervisor_nombre
                FROM [dbo].[GAC_APP_TB_COLABORADORES_CAS] cas
                INNER JOIN [dbo].[GAC_APP_TB_COLABORADORES_CAS_HISTORIAL_SUPERVISORES] h 
                    ON cas.Id_colaborar = h.Id_colaborar 
                INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON h.Supervisor = e.ID_empleado
                WHERE cas.Nombre_FSM LIKE '%' + t.NombreTecnico + '%' 
                  AND cas.Nombre_FSM LIKE '%' + t.ApellidoTecnico + '%'
                ORDER BY 
                    CASE WHEN h.Fecha_fin IS NULL OR h.Fecha_fin >= GETDATE() THEN 1 ELSE 0 END DESC,
                    h.Fecha_inicio DESC,
                    h.Creado_el DESC
            ) sup_cas
            -- SOLE Supervisor
            OUTER APPLY (
                SELECT TOP 1 e.Nombre_Empleado as supervisor_nombre
                FROM [dbo].[GAC_APP_TB_EMPLEADOS_DATOS_ADICIONAL] da
                INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS_INFORMACION_ADICIONAL] ia ON da.Empleado = ia.Empleado
                INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON ia.Jefe_directo = e.ID_empleado
                WHERE (t.NombreTecnico + ' ' + t.ApellidoTecnico) = da.[Nombre SAP]
            ) sup_sole
            ${whereClause}
            ORDER BY ${dbCol} ASC
        `;

        const result = await request.query(query);
        
        // Map resolved store names for tienda
        let values = result.recordset.map(r => r.value);
        if (column === 'tienda') {
            values = values.map(v => resolveStoreDescription(v));
            // De-duplicate after resolution
            values = [...new Set(values)];
        }

        res.json(values);
    } catch (error: any) {
        console.error('Error fetching unique values:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CXG/NC: List (Paginated)
// ─────────────────────────────────────────────

router.get('/cxg-nc', verifyPermission('cxg.cxg_nc.view'), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const search = req.query.search as string || '';
        const tipo = req.query.tipo as string || 'TODOS';
        const estado = req.query.estado as string || 'TODOS';
        
        const sortBy = req.query.sortBy as string || 'fecha_creacion';
        const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const offset = (page - 1) * pageSize;

        const pool = await getDbConnection();

        // Base CTE to wrap complex columns
        const baseCte = `
            WITH BaseQuery AS (
                SELECT 
                    n.ID_Apro_CxG_NC as id,
                    n.Tipo as tipo,
                    n.Ticket as correlativo,
                    n.Creado_el as fecha_creacion,
                    COALESCE(t.NombreCliente, n.Tienda) as cliente,
                    CASE 
                        WHEN n.Procesado = 'true' THEN 'CERRADO'
                        WHEN n.Procesado_por IS NOT NULL AND n.Procesado_por <> '' THEN 'ASIGNADO'
                        WHEN n.Aprobado = 'false' THEN 'RECHAZADO'
                        WHEN n.Aprobado = 'true' THEN 'APROBADO_SUP'
                        ELSE 'REGISTRADO'
                    END as estado,
                    n.Aprobado as aprobado,
                    n.Aprobado_motivo as aprobado_motivo,
                    n.Aprobado_observacion as aprobado_observacion,
                    n.Aprobado_el as aprobado_el,
                    n.Aprobado_por as aprobado_por,
                    n.Creado_por as creado_por,
                    n.Procesado as procesado,
                    n.Procesado_por as procesado_por,
                    n.Procesado_el as procesado_el,
                    t.CodigoExternoCliente as documento_cliente,
                    t.CodigoExternoEquipo as codigo_producto,
                    t.NombreEquipo as producto,
                    COALESCE(emp.DsEmpresa, CAST(t.IDEmpresa as VARCHAR)) as tienda,
                    COALESCE(sup_cas.supervisor_nombre, sup_sole.supervisor_nombre) as supervisor
                FROM [dbo].[GAC_APP_TB_CXG_NC] n
                LEFT JOIN [SIATC].[Dashboard_FSM] t ON n.Ticket = t.Ticket
                LEFT JOIN [SAP].[FSM_TBL_EMPRESA] emp ON t.IDEmpresa = CAST(emp.IdEmpresa as VARCHAR)
                -- CAS Supervisor (OUTER APPLY TOP 1 to avoid fan-out, prioritizing active and sorting historically)
                OUTER APPLY (
                    SELECT TOP 1 e.Nombre_Empleado as supervisor_nombre
                    FROM [dbo].[GAC_APP_TB_COLABORADORES_CAS] cas
                    INNER JOIN [dbo].[GAC_APP_TB_COLABORADORES_CAS_HISTORIAL_SUPERVISORES] h 
                        ON cas.Id_colaborar = h.Id_colaborar 
                    INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON h.Supervisor = e.ID_empleado
                    WHERE cas.Nombre_FSM LIKE '%' + t.NombreTecnico + '%' 
                      AND cas.Nombre_FSM LIKE '%' + t.ApellidoTecnico + '%'
                    ORDER BY 
                        CASE WHEN h.Fecha_fin IS NULL OR h.Fecha_fin >= GETDATE() THEN 1 ELSE 0 END DESC,
                        h.Fecha_inicio DESC,
                        h.Creado_el DESC
                ) sup_cas
                -- SOLE Supervisor (OUTER APPLY TOP 1 to avoid fan-out)
                OUTER APPLY (
                    SELECT TOP 1 e.Nombre_Empleado as supervisor_nombre
                    FROM [dbo].[GAC_APP_TB_EMPLEADOS_DATOS_ADICIONAL] da
                    INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS_INFORMACION_ADICIONAL] ia ON da.Empleado = ia.Empleado
                    INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON ia.Jefe_directo = e.ID_empleado
                    WHERE (t.NombreTecnico + ' ' + t.ApellidoTecnico) = da.[Nombre SAP]
                ) sup_sole
            )
        `;

        let whereClause = 'WHERE 1=1';
        if (search) {
            whereClause += ` AND (correlativo LIKE @search OR tienda LIKE @search OR cliente LIKE @search)`;
        }
        
        if (tipo !== 'TODOS') {
            if (tipo === 'NC') {
                whereClause += ` AND (tipo = 'NC' OR tipo = 'Nota de Credito')`;
            } else if (tipo === 'CXG') {
                whereClause += ` AND (tipo = 'CXG' OR tipo = 'Cambio por Garantia')`;
            } else {
                whereClause += ` AND tipo = @tipo`;
            }
        }

        if (estado !== 'TODOS') {
            whereClause += ` AND estado = @estado`;
        }

        const countRequest = pool.request();
        const dataRequest = pool.request();

        // Process dynamic column filters
        const filterMappings: Record<string, string> = {
            tipo: 'tipo',
            documento: 'documento_cliente',
            ticket: 'correlativo',
            tienda: 'tienda',
            cliente: 'cliente',
            creado_por: 'creado_por',
            supervisor: 'supervisor',
            aprobado: 'aprobado',
            procesado: 'procesado',
            estado: 'estado',
            codigo_producto: 'codigo_producto',
            producto: 'producto'
        };

        let filterIndex = 0;
        for (const key in req.query) {
            if (key.startsWith('filter_')) {
                const colKey = key.replace('filter_', '');
                
                // Handle date ranges specially
                if (colKey.endsWith('_start') || colKey.endsWith('_end')) {
                    const baseColKey = colKey.replace(/_(start|end)$/, '');
                    const dbCol = filterMappings[baseColKey];
                    const value = req.query[key] as string;
                    if (dbCol && value) {
                        if (colKey.endsWith('_start')) {
                            whereClause += ` AND CAST(${dbCol} AS DATE) >= @fval${filterIndex}`;
                        } else {
                            whereClause += ` AND CAST(${dbCol} AS DATE) <= @fval${filterIndex}`;
                        }
                        countRequest.input(`fval${filterIndex}`, sql.Date, value);
                        dataRequest.input(`fval${filterIndex}`, sql.Date, value);
                        filterIndex++;
                    }
                    continue;
                }

                const dbCol = filterMappings[colKey];
                const value = req.query[key] as string;
                if (dbCol && value) {
                    if (colKey === 'aprobado' || colKey === 'procesado') {
                        if (value === 'Pendiente') {
                            whereClause += ` AND (${dbCol} IS NULL OR ${dbCol} = '')`;
                        } else if (value === 'Aprobado') {
                            whereClause += ` AND (${dbCol} = 'true' OR ${dbCol} = 'Si' OR ${dbCol} = 'APROBADO')`;
                        } else if (value === 'Rechazado') {
                            whereClause += ` AND (${dbCol} = 'false' OR ${dbCol} = 'No' OR ${dbCol} = 'RECHAZADO')`;
                        }
                    } else {
                        whereClause += ` AND ${dbCol} LIKE @fval${filterIndex}`;
                        countRequest.input(`fval${filterIndex}`, sql.VarChar, `%${value}%`);
                        dataRequest.input(`fval${filterIndex}`, sql.VarChar, `%${value}%`);
                        filterIndex++;
                    }
                }
            }
        }

        countRequest.input('search', sql.VarChar, `%${search}%`);
        if (tipo !== 'TODOS' && tipo !== 'NC' && tipo !== 'CXG') countRequest.input('tipo', sql.VarChar, tipo);
        if (estado !== 'TODOS') countRequest.input('estado', sql.VarChar, estado);

        const countResult = await countRequest.query(`
            ${baseCte}
            SELECT COUNT(*) as total 
            FROM BaseQuery
            ${whereClause}
        `);
        
        const total = countResult.recordset[0].total;

        dataRequest.input('search', sql.VarChar, `%${search}%`);
        dataRequest.input('offset', sql.Int, offset);
        dataRequest.input('pageSize', sql.Int, pageSize);
        if (tipo !== 'TODOS' && tipo !== 'NC' && tipo !== 'CXG') dataRequest.input('tipo', sql.VarChar, tipo);
        if (estado !== 'TODOS') dataRequest.input('estado', sql.VarChar, estado);

        // Mapping sortBy to CTE columns
        const sortMappings: Record<string, string> = {
            ...filterMappings,
            fecha_creacion: 'fecha_creacion'
        };
        const orderCol = sortMappings[sortBy] || 'fecha_creacion';

        const result = await dataRequest.query(`
            ${baseCte}
            SELECT *, fecha_creacion as fecha
            FROM BaseQuery
            ${whereClause}
            ORDER BY ${orderCol} ${sortOrder}
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY
        `);

        const formattedData = result.recordset.map(row => ({
            ...row,
            tienda: resolveStoreDescription(row.tienda)
        }));

        res.json({
            data: formattedData,
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

router.get('/cxg-nc/:id/historial', verifyPermission('cxg.cxg_nc.view'), async (req: Request, res: Response) => {
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

router.get('/cxg-nc/:id', verifyPermission('cxg.cxg_nc.view'), async (req: Request, res: Response) => {
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
                    COALESCE(t.NombreCliente, n.Tienda) as cliente,
                    n.Observacion as observacion_inicial,
                    CASE 
                        WHEN n.Procesado = 'true' THEN 'CERRADO'
                        WHEN n.Procesado_por IS NOT NULL AND n.Procesado_por <> '' THEN 'ASIGNADO'
                        WHEN n.Aprobado = 'false' THEN 'RECHAZADO'
                        WHEN n.Aprobado = 'true' THEN 'APROBADO_SUP'
                        ELSE 'REGISTRADO'
                    END as estado,
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
                    n.Ticket as ticket,
                    COALESCE(t.ComentarioProgramador, '') as fsm_motivo_elevacion,
                    COALESCE(emp.DsEmpresa, CAST(t.IDEmpresa as VARCHAR)) as fsm_lugar_compra,
                    COALESCE(sup_cas.supervisor_nombre, sup_sole.supervisor_nombre) as supervisor_asignado,
                    t.NombreCliente as fsm_cliente,
                    t.CodigoExternoEquipo as codigo_producto,
                    t.NombreEquipo as producto
                FROM [dbo].[GAC_APP_TB_CXG_NC] n
                LEFT JOIN [SIATC].[Dashboard_FSM] t ON n.Ticket = t.Ticket
                LEFT JOIN [SAP].[FSM_TBL_EMPRESA] emp ON t.IDEmpresa = CAST(emp.IdEmpresa as VARCHAR)
                -- CAS Supervisor (OUTER APPLY TOP 1 to avoid fan-out, prioritizing active and sorting historically)
                OUTER APPLY (
                    SELECT TOP 1 e.Nombre_Empleado as supervisor_nombre
                    FROM [dbo].[GAC_APP_TB_COLABORADORES_CAS] cas
                    INNER JOIN [dbo].[GAC_APP_TB_COLABORADORES_CAS_HISTORIAL_SUPERVISORES] h 
                        ON cas.Id_colaborar = h.Id_colaborar 
                    INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON h.Supervisor = e.ID_empleado
                    WHERE cas.Nombre_FSM LIKE '%' + t.NombreTecnico + '%' 
                      AND cas.Nombre_FSM LIKE '%' + t.ApellidoTecnico + '%'
                    ORDER BY 
                        CASE WHEN h.Fecha_fin IS NULL OR h.Fecha_fin >= GETDATE() THEN 1 ELSE 0 END DESC,
                        h.Fecha_inicio DESC,
                        h.Creado_el DESC
                ) sup_cas
                -- SOLE Supervisor (OUTER APPLY TOP 1 to avoid fan-out)
                OUTER APPLY (
                    SELECT TOP 1 e.Nombre_Empleado as supervisor_nombre
                    FROM [dbo].[GAC_APP_TB_EMPLEADOS_DATOS_ADICIONAL] da
                    INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS_INFORMACION_ADICIONAL] ia ON da.Empleado = ia.Empleado
                    INNER JOIN [dbo].[GAC_APP_TB_EMPLEADOS] e ON ia.Jefe_directo = e.ID_empleado
                    WHERE (t.NombreTecnico + ' ' + t.ApellidoTecnico) = da.[Nombre SAP]
                ) sup_sole
                WHERE n.ID_Apro_CxG_NC = @id
            `);
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'No se encontró la solicitud CxG/NC' });
        }
        const ticketData = result.recordset[0];
        ticketData.fsm_lugar_compra = resolveStoreDescription(ticketData.fsm_lugar_compra);
        res.json(ticketData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CANCELACIONES: Create
// ─────────────────────────────────────────────

router.post('/cancelaciones', verifyPermission('cxg.cancelaciones.create'), async (req: Request, res: Response) => {
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
                (ID_Cancelados, Ticket, Motivo_Cancelacion, Autorizador_Cancelacion, Generado_el, Estado_Proceso, Creado_por)
                VALUES (@id, @ticket, @motivo, @autorizador, GETDATE(), 'REGISTRADO', @autorizador)
            `);
            
        await pool.request()
                .input('histId', sql.VarChar, Math.random().toString(16).substring(2, 10).toUpperCase())
                .input('id', sql.VarChar, id)
                .input('accion', sql.VarChar, 'Creación')
                .input('obs', sql.VarChar, observacion || 'Solicitud registrada')
                .input('usuario', sql.VarChar, usuario || 'Sistema')
                .query(`
                    INSERT INTO [dbo].[GAC_APP_TB_HISTORIAL_CANCELACIONES]
                    (ID_Historial_Cancelacion, ID_Cancelados, Accion, Observacion, Creado_el, Creado_por)
                    VALUES (@histId, @id, @accion, @obs, GETDATE(), @usuario)
                `);
        res.status(201).json({ message: 'Cancelación registrada', id });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CANCELACIONES: Gestionar
// ─────────────────────────────────────────────

router.post('/cancelaciones/:id/gestionar', verifyPermission('cxg.cancelaciones.process'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { 
            cancelacion_correcta,
            motivo_correcto,
            observacion,
            gestionado_por,
        } = req.body;
        
        const pool = await getDbConnection();
        const checkState = await pool.request().input('id', sql.VarChar, id).query(`SELECT Estado_Proceso FROM [dbo].[GAC_APP_TB_CANCELACIONES] WHERE ID_Cancelados = @id`);
        if (checkState.recordset.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
        if (checkState.recordset[0].Estado_Proceso !== 'VALIDADO') {
            return res.status(400).json({ error: `Acción inválida. Estado actual: ${checkState.recordset[0].Estado_Proceso}. Se requiere: VALIDADO.` });
        }

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
                    Estado_Proceso = 'CERRADO',
                    Modificado_por = @gestionado_por,
                    Modificado_el = GETDATE()
                WHERE ID_Cancelados = @id
            `);
        await pool.request()
                .input('histId', sql.VarChar, Math.random().toString(16).substring(2, 10).toUpperCase())
                .input('id', sql.VarChar, id)
                .input('accion', sql.VarChar, 'Gestión Final')
                .input('obs', sql.VarChar, observacion || 'Se gestionó la solicitud')
                .input('usuario', sql.VarChar, gestionado_por || 'Sistema')
                .query(`
                    INSERT INTO [dbo].[GAC_APP_TB_HISTORIAL_CANCELACIONES]
                    (ID_Historial_Cancelacion, ID_Cancelados, Accion, Observacion, Creado_el, Creado_por)
                    VALUES (@histId, @id, @accion, @obs, GETDATE(), @usuario)
                `);
        res.json({ message: 'Cancelación gestionada correctamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────
// CANCELACIONES: Asignar
// ─────────────────────────────────────────────

router.post('/cancelaciones/:id/asignar', verifyPermission('cxg.cancelaciones.assign'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { asignado_a, asignado_por } = req.body;
        const pool = await getDbConnection();
        const checkState = await pool.request().input('id', sql.VarChar, id).query(`SELECT Estado_Proceso FROM [dbo].[GAC_APP_TB_CANCELACIONES] WHERE ID_Cancelados = @id`);
        if (checkState.recordset.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
        if (checkState.recordset[0].Estado_Proceso !== 'APROBADO_SUP') {
            return res.status(400).json({ error: `Acción inválida. Estado actual: ${checkState.recordset[0].Estado_Proceso}. Se requiere: APROBADO_SUP.` });
        }

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
                    Estado_Proceso = 'ASIGNADO',
                    Modificado_por = @asignado_por,
                    Modificado_el = GETDATE()
                WHERE ID_Cancelados = @id
            `);
        await pool.request()
                .input('histId', sql.VarChar, Math.random().toString(16).substring(2, 10).toUpperCase())
                .input('id', sql.VarChar, id)
                .input('accion', sql.VarChar, 'Asignación')
                .input('obs', sql.VarChar, 'Asignado a: ' + asignado_a)
                .input('usuario', sql.VarChar, asignado_por || 'Sistema')
                .query(`
                    INSERT INTO [dbo].[GAC_APP_TB_HISTORIAL_CANCELACIONES]
                    (ID_Historial_Cancelacion, ID_Cancelados, Accion, Observacion, Creado_el, Creado_por)
                    VALUES (@histId, @id, @accion, @obs, GETDATE(), @usuario)
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

router.post('/cxg-nc', verifyPermission('cxg.cxg_nc.create'), async (req: Request, res: Response) => {
    try {
        const { tipo, cliente, ticket, observacion } = req.body;
        const pool = await getDbConnection();

        // 1. Check if ticket already exists in an active state
        const existingCheck = await pool.request()
            .input('ticket', sql.VarChar, ticket)
            .query(`
                SELECT TOP 1 ID_Apro_CxG_NC, Estado_Proceso
                FROM [dbo].[GAC_APP_TB_CXG_NC]
                WHERE Ticket = @ticket AND Estado_Proceso NOT IN ('CERRADO', 'RECHAZADO')
            `);

        if (existingCheck.recordset.length > 0) {
            return res.status(400).json({ 
                error: `El ticket #${ticket} ya tiene una solicitud activa en estado: ${existingCheck.recordset[0].Estado_Proceso}` 
            });
        }

        const solicitudId = `CNC-${Date.now()}`;
        const histId = Math.random().toString(16).substring(2, 10).toUpperCase();
        
        await pool.request()
            .input('id', sql.VarChar, solicitudId)
            .input('ticket', sql.VarChar, ticket || 'MT-TK-TEMP')
            .input('tipo', sql.VarChar, tipo)
            .input('tienda', sql.VarChar, cliente)
            .input('observacion', sql.VarChar, observacion || '')
            .input('usuario', sql.VarChar, req.body.usuario || 'Sistema')
            .input('motivo_elevacion', sql.NVarChar, motivo_elevacion || null)
            .input('lugar_compra', sql.NVarChar, lugar_compra || null)
            .input('supervisor_fsm', sql.NVarChar, supervisor_fsm || null)
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_CXG_NC] 
                (ID_Apro_CxG_NC, Ticket, Tipo, Tienda, Observacion, Creado_el, Creado_por, Procesado, Estado_Proceso, Motivo_Elevacion, Lugar_Compra, Supervisor_FSM)
                VALUES (@id, @ticket, @tipo, @tienda, @observacion, GETDATE(), @usuario, 'false', 'REGISTRADO', @motivo_elevacion, @lugar_compra, @supervisor_fsm)
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

router.post('/cxg-nc/:id/aprobar-solicitud', verifyPermission('cxg.cxg_nc.approve'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { aprobado, motivo, observacion, usuario } = req.body;
        const pool = await getDbConnection();
        const checkState = await pool.request().input('id', sql.VarChar, id).query(`
            SELECT 
                CASE 
                    WHEN Procesado = 'true' THEN 'CERRADO'
                    WHEN Procesado_por IS NOT NULL AND Procesado_por <> '' THEN 'ASIGNADO'
                    WHEN Aprobado = 'false' THEN 'RECHAZADO'
                    WHEN Aprobado = 'true' THEN 'APROBADO_SUP'
                    ELSE 'REGISTRADO'
                END as Estado_Proceso
            FROM [dbo].[GAC_APP_TB_CXG_NC] WHERE ID_Apro_CxG_NC = @id
        `);
        if (checkState.recordset.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
        if (checkState.recordset[0].Estado_Proceso !== 'REGISTRADO') {
            return res.status(400).json({ error: `Acción inválida. Estado actual: ${checkState.recordset[0].Estado_Proceso}. Se requiere: REGISTRADO.` });
        }

        const histId = Math.random().toString(16).substring(2, 10).toUpperCase();

        // Update main table
        await pool.request()
            .input('id', sql.VarChar, id)
            .input('aprobado', sql.VarChar, aprobado) // 'Si' | 'No'
            .input('motivo', sql.VarChar, motivo || null)
            .input('obs', sql.VarChar, observacion || '')
            .input('por', sql.VarChar, usuario || '')
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CXG_NC] 
                SET 
                    Aprobado = @aprobado,
                    Aprobado_motivo = @motivo,
                    Aprobado_observacion = @obs,
                    Aprobado_por = @por,
                    Aprobado_el = GETDATE()
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

router.post('/cxg-nc/:id/asignar', verifyPermission('cxg.cxg_nc.assign'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { asignado_a, asignado_por, asignado_nombre } = req.body;
        const pool = await getDbConnection();
        const checkState = await pool.request().input('id', sql.VarChar, id).query(`
            SELECT 
                CASE 
                    WHEN Procesado = 'true' THEN 'CERRADO'
                    WHEN Procesado_por IS NOT NULL AND Procesado_por <> '' THEN 'ASIGNADO'
                    WHEN Aprobado = 'false' THEN 'RECHAZADO'
                    WHEN Aprobado = 'true' THEN 'APROBADO_SUP'
                    ELSE 'REGISTRADO'
                END as Estado_Proceso
            FROM [dbo].[GAC_APP_TB_CXG_NC] WHERE ID_Apro_CxG_NC = @id
        `);
        if (checkState.recordset.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
        if (checkState.recordset[0].Estado_Proceso !== 'APROBADO_SUP') {
            return res.status(400).json({ error: `Acción inválida. Estado actual: ${checkState.recordset[0].Estado_Proceso}. Se requiere: APROBADO_SUP.` });
        }

        const histId = Math.random().toString(16).substring(2, 10).toUpperCase();

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('asignado_a', sql.VarChar, asignado_a)
            .input('asignado_por', sql.VarChar, asignado_por)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CXG_NC] 
                SET Procesado_por = @asignado_a
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

router.post('/cxg-nc/:id/gestionar', verifyPermission('cxg.cxg_nc.process'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { observacion, gestionado_por, resultado, motivo } = req.body;
        const pool = await getDbConnection();
        const checkState = await pool.request().input('id', sql.VarChar, id).query(`
            SELECT 
                CASE 
                    WHEN Procesado = 'true' THEN 'CERRADO'
                    WHEN Procesado_por IS NOT NULL AND Procesado_por <> '' THEN 'ASIGNADO'
                    WHEN Aprobado = 'false' THEN 'RECHAZADO'
                    WHEN Aprobado = 'true' THEN 'APROBADO_SUP'
                    ELSE 'REGISTRADO'
                END as Estado_Proceso
            FROM [dbo].[GAC_APP_TB_CXG_NC] WHERE ID_Apro_CxG_NC = @id
        `);
        if (checkState.recordset.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
        if (checkState.recordset[0].Estado_Proceso !== 'ASIGNADO') {
            return res.status(400).json({ error: `Acción inválida. Estado actual: ${checkState.recordset[0].Estado_Proceso}. Se requiere: ASIGNADO.` });
        }

        const histId = Math.random().toString(16).substring(2, 10).toUpperCase();

        await pool.request()
            .input('id', sql.VarChar, id)
            .input('observacion', sql.VarChar, observacion || '')
            .input('gestionado_por', sql.VarChar, gestionado_por || '')
            .input('resultado', sql.VarChar, resultado || 'Si')
            .input('motivo', sql.VarChar, motivo || '')
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CXG_NC] 
                SET Procesado = @resultado, Procesado_el = GETDATE(), Procesado_por = @gestionado_por, 
                    Procesado_observacion = @observacion,
                    Procesado_motivo = @motivo
                WHERE ID_Apro_CxG_NC = @id
            `);

        // Insert history entry
        await pool.request()
            .input('histId', sql.VarChar, histId)
            .input('solicitud', sql.VarChar, id)
            .input('tipo', sql.VarChar, 'Gestión')
            .input('obs', sql.VarChar, `${resultado === 'true' ? 'PROCESADO' : 'RECHAZADO'} — ${observacion || ''}`)
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

router.post('/cancelaciones/:id/aprobar-solicitud', verifyPermission('cxg.cancelaciones.gestionar'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { aprobado, observacion, usuario } = req.body;
        const pool = await getDbConnection();
        const checkState = await pool.request().input('id', sql.VarChar, id).query(`SELECT Estado_Proceso FROM [dbo].[GAC_APP_TB_CANCELACIONES] WHERE ID_Cancelados = @id`);
        if (checkState.recordset.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
        if (checkState.recordset[0].Estado_Proceso !== 'REGISTRADO') {
            return res.status(400).json({ error: `Acción inválida. Estado actual: ${checkState.recordset[0].Estado_Proceso}. Se requiere: REGISTRADO.` });
        }

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

router.post('/cancelaciones/:id/validar-cliente', verifyPermission('cxg.cancelaciones.process'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { resultado, observacion, usuario, motivo_real } = req.body;
        const pool = await getDbConnection();
        const checkState = await pool.request().input('id', sql.VarChar, id).query(`SELECT Estado_Proceso FROM [dbo].[GAC_APP_TB_CANCELACIONES] WHERE ID_Cancelados = @id`);
        if (checkState.recordset.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
        if (checkState.recordset[0].Estado_Proceso !== 'ASIGNADO') {
            return res.status(400).json({ error: `Acción inválida. Estado actual: ${checkState.recordset[0].Estado_Proceso}. Se requiere: ASIGNADO.` });
        }

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



export default router;
