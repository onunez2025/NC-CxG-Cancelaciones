import { getDbConnection } from './db.js';

getDbConnection().then(async pool => {
    try {
        await pool.request().query('ALTER TABLE EBM.SAP_ME2K ALTER COLUMN Quantity DECIMAL(18,4)');
        await pool.request().query('ALTER TABLE EBM.SAP_ME5K ALTER COLUMN Quantity DECIMAL(18,4)');
        await pool.request().query('ALTER TABLE EBM.SAP_ME5A ALTER COLUMN Quantity DECIMAL(18,4)');
        console.log('Schema updated successfully');
    } catch (err) {
        console.error('Error updating schema:', err);
    }
    process.exit(0);
}).catch(console.error);
