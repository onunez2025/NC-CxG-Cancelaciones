import dotenv from 'dotenv';
import sql from 'mssql';

// Load environment variables from .env
dotenv.config();

// SQL Server configuration
const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    server: process.env.DB_SERVER || '',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    requestTimeout: 30000,
    options: {
        encrypt: true, // For Azure
        trustServerCertificate: true // Change to true for local dev / self-signed certs
    }
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

/**
 * Gets a connection pool to the Azure database (Singleton pattern)
 */
export async function getDbConnection(): Promise<sql.ConnectionPool> {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(sqlConfig).connect().catch((err: unknown) => {
            console.error('Database Connection Failed! Bad Config: ', err);
            poolPromise = null; // Clear so we can retry if it failed
            throw err;
        });
    }
    return poolPromise;
}
