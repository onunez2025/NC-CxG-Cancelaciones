const sql = require('mssql');
require('dotenv').config();

async function run() {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            options: { encrypt: true, trustServerCertificate: true }
        });

        const search = '12';
        const page = 1;
        const pageSize = 20;
        const offset = (page - 1) * pageSize;

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

        const countRequest = pool.request();
        const dataRequest = pool.request();

        countRequest.input('search', sql.VarChar, `%${search}%`);
        dataRequest.input('search', sql.VarChar, `%${search}%`);
        dataRequest.input('offset', sql.Int, offset);
        dataRequest.input('pageSize', sql.Int, pageSize);

        console.log("Running count query...");
        const countResult = await countRequest.query(`
            ${baseCte}
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'REGISTRADO' THEN 1 ELSE 0 END) as registrado,
                SUM(CASE WHEN estado = 'APROBADO_SUP' THEN 1 ELSE 0 END) as aprobado,
                SUM(CASE WHEN estado = 'ASIGNADO' THEN 1 ELSE 0 END) as asignado,
                SUM(CASE WHEN estado = 'VALIDADO' THEN 1 ELSE 0 END) as validado,
                SUM(CASE WHEN estado = 'CERRADO' THEN 1 ELSE 0 END) as cerrado
            FROM BaseQuery
            ${whereClause}
        `);
        console.log("Count query succeeded:", countResult.recordset[0]);

        console.log("Running data query...");
        const result = await dataRequest.query(`
            ${baseCte}
            SELECT *, fecha_creacion as fecha
            FROM BaseQuery
            ${whereClause}
            ORDER BY fecha_creacion DESC
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY
        `);
        console.log("Data query succeeded, row count:", result.recordset.length);

        process.exit(0);
    } catch (e) {
        console.error("Error caught:", e);
        process.exit(1);
    }
}
run();
