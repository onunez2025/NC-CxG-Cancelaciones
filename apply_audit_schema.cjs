const sql = require('mssql');
require('dotenv').config();

async function migrateSchema() {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            options: { encrypt: true, trustServerCertificate: true }
        });

        console.log("Adding columns to GAC_APP_TB_CXG_NC...");
        await pool.request().query(`
            IF COL_LENGTH('dbo.GAC_APP_TB_CXG_NC', 'Modificado_por') IS NULL
            BEGIN
                ALTER TABLE dbo.GAC_APP_TB_CXG_NC ADD Modificado_por VARCHAR(150);
                ALTER TABLE dbo.GAC_APP_TB_CXG_NC ADD Modificado_el DATETIME;
            END
        `);

        console.log("Adding columns to GAC_APP_TB_CANCELACIONES...");
        await pool.request().query(`
            IF COL_LENGTH('dbo.GAC_APP_TB_CANCELACIONES', 'Creado_por') IS NULL
            BEGIN
                ALTER TABLE dbo.GAC_APP_TB_CANCELACIONES ADD Creado_por VARCHAR(150);
            END
            IF COL_LENGTH('dbo.GAC_APP_TB_CANCELACIONES', 'Modificado_por') IS NULL
            BEGIN
                ALTER TABLE dbo.GAC_APP_TB_CANCELACIONES ADD Modificado_por VARCHAR(150);
                ALTER TABLE dbo.GAC_APP_TB_CANCELACIONES ADD Modificado_el DATETIME;
            END
        `);

        console.log("Creating table GAC_APP_TB_HISTORIAL_CANCELACIONES...");
        await pool.request().query(`
            IF OBJECT_ID('dbo.GAC_APP_TB_HISTORIAL_CANCELACIONES', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GAC_APP_TB_HISTORIAL_CANCELACIONES (
                    ID_Historial_Cancelacion VARCHAR(150) NOT NULL PRIMARY KEY,
                    ID_Cancelados VARCHAR(150) NOT NULL,
                    Accion VARCHAR(150),
                    Observacion VARCHAR(MAX),
                    Creado_el DATETIME,
                    Creado_por VARCHAR(150)
                );
            END
        `);

        console.log("Schema migration completed successfully.");
        process.exit(0);
    } catch (e) {
        console.error("Error migrating schema:", e);
        process.exit(1);
    }
}

migrateSchema();
