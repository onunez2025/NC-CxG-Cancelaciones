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
        trustServerCertificate: false
    }
};

async function testConnection() {
    try {
        console.log("Intentando conectar con config:", { ...sqlConfig, password: "***" });
        const pool = await sql.connect(sqlConfig);
        const result = await pool.request().query('SELECT @@VERSION as version');
        console.log("Conectado exitosamente!", result.recordset[0]);
        await pool.close();
    } catch (err) {
        console.error("Fallo de conexión:", err);
    }
}

testConnection();
