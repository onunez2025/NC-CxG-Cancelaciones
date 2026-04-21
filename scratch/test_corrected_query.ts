
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    server: process.env.DB_SERVER || '',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function checkCorrectedQuery() {
    try {
        const pool = await sql.connect(sqlConfig);
        console.log('Testing CORRECTED query for cancelaciones...');
        const result = await pool.request().query(`
            SELECT TOP 5
                c.ID_Cancelados as id,
                c.Ticket as correlativo,
                c.Generado_el as fecha_solicitud,
                ISNULL(t.NombreCliente, c.Gestionado_por) as cliente,
                c.Motivo_Cancelacion as motive,
                CASE 
                    WHEN c.Cancelacion_Correcta = 'SI' THEN 'APROBADO'
                    WHEN c.Cancelacion_Correcta = 'NO' THEN 'RECHAZADO'
                    ELSE 'PENDIENTE'
                END as estado,
                ISNULL(v.Monto, 0) as monto
            FROM [dbo].[GAC_APP_TB_CANCELACIONES] c
            LEFT JOIN [SIATC].[Dashboard_FSM] t ON c.Ticket = t.Ticket
            LEFT JOIN [dbo].[GAC_APP_TB_VALORIZACIONES_DETALLE] v ON c.Ticket = v.Ticket
            ORDER BY c.Generado_el DESC
        `);
        console.log('Result:', result.recordset.length, 'rows fetched');
        console.log('Sample data:', JSON.stringify(result.recordset[0], null, 2));
        await pool.close();
    } catch (err) {
        console.error('Query failed:', err.message);
    }
}

checkCorrectedQuery();
