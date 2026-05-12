import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

async function runQuery() {
    try {
        await sql.connect(config);
        const result = await sql.query(`
            SELECT TOP 1
                n.ID_Apro_CxG_NC as id,
                COALESCE(n.Supervisor_FSM, sup_cas_emp.Nombre_Empleado, sup_sole_emp.Nombre_Empleado) as supervisor
            FROM [dbo].[GAC_APP_TB_CXG_NC] n
            LEFT JOIN [SIATC].[Dashboard_FSM] t ON n.Ticket = t.Ticket
            LEFT JOIN [SAP].[FSM_TBL_EMPRESA] emp ON t.IDEmpresa = CAST(emp.IdEmpresa as VARCHAR)
            -- CAS Logic
            LEFT JOIN [dbo].[GAC_APP_TB_COLABORADORES_CAS] cas ON 
                cas.Nombre_FSM LIKE '%' + t.NombreTecnico + '%' AND cas.Nombre_FSM LIKE '%' + t.ApellidoTecnico + '%'
            LEFT JOIN [dbo].[GAC_APP_TB_COLABORADORES_CAS_HISTORIAL_SUPERVISORES] sup_cas_hist ON 
                cas.Id_colaborar = sup_cas_hist.Id_colaborar AND (sup_cas_hist.Fecha_fin IS NULL OR sup_cas_hist.Fecha_fin >= GETDATE())
            LEFT JOIN [dbo].[GAC_APP_TB_EMPLEADOS] sup_cas_emp ON sup_cas_hist.Supervisor = sup_cas_emp.ID_empleado
            -- SOLE Logic
            LEFT JOIN [dbo].[GAC_APP_TB_EMPLEADOS_DATOS_ADICIONAL] emp_da ON 
                (t.NombreTecnico + ' ' + t.ApellidoTecnico) = emp_da.[Nombre SAP]
            LEFT JOIN [dbo].[GAC_APP_TB_EMPLEADOS_INFORMACION_ADICIONAL] info ON emp_da.Empleado = info.Empleado
            LEFT JOIN [dbo].[GAC_APP_TB_EMPLEADOS] sup_sole_emp ON info.Jefe_directo = sup_sole_emp.ID_empleado
        `);
        console.log("Success:", result.recordset);
    } catch (err) {
        console.error("SQL Error:", err);
    } finally {
        await sql.close();
    }
}
runQuery();
