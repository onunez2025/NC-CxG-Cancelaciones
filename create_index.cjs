const sql = require('mssql');
require('dotenv').config();

async function createIndex() {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            options: { encrypt: true, trustServerCertificate: true }
        });

        console.log("Creando índice...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_CXG_NC_ESTADO_TIPO_FECHA' AND object_id = OBJECT_ID('[dbo].[GAC_APP_TB_CXG_NC]'))
            BEGIN
                CREATE NONCLUSTERED INDEX IDX_CXG_NC_ESTADO_TIPO_FECHA 
                ON [dbo].[GAC_APP_TB_CXG_NC] (Estado_Proceso, Tipo, Creado_el DESC)
                INCLUDE (Ticket, Tienda, Asignado_a, Gestionado);
            END
        `);
        console.log("Índice creado exitosamente.");
        process.exit(0);
    } catch (e) {
        console.error("Error creando el índice:", e);
        process.exit(1);
    }
}
createIndex();
