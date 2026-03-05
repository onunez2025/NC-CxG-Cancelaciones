const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function clearSAP() {
    try {
        console.log("Conectando a la base de datos...");
        const pool = await sql.connect(config);
        console.log("Truncando tablas...");
        await pool.request().query(`
            DELETE FROM EBM.SAP_ME2K;
            DELETE FROM EBM.SAP_ME5K;
            DELETE FROM EBM.SAP_ME5A;
            DELETE FROM EBM.SAP_KSB1;
            DELETE FROM EBM.SAP_FBL1N;
            DELETE FROM EBM.SAPUploads;
        `);
        console.log("¡Éxito! Todas las 5 tablas SAP y SAPUploads han sido vaciadas completamente.");
        process.exit(0);
    } catch (err) {
        console.error("Error limpiando las tablas:", err);
        process.exit(1);
    }
}

clearSAP();
