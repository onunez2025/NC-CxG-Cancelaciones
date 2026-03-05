import { getDbConnection } from './server/db.js';
import sql from 'mssql';
import { createSapMe2kTable } from './server/utils/sapParser.js';

async function testUploadTransaction() {
    const id = 'FAKE_UPLOAD_' + Date.now();
    const transaction_type = 'ME2K';
    const upload_date = new Date().toISOString();
    const uploaded_by = 'test_script';

    // Simulate what the frontend parsed
    const data = [
        {
            po_number: 'PO123',
            cost_center: 'MT050002',
            gl_account: '12345',
            vendor_id: 'V123',
            description: 'Test Desc',
            order_value: 100.0,
            net_price: 10.0,
            quantity: 10.0,
            currency: 'PEN',
            release_status: 'A',
            release_strategy: 'S1'
        }
    ];

    const pool = await getDbConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        console.log("-> Borrando antiguos ME2K...");
        await transaction.request()
            .input('transaction_type', sql.NVarChar(20), transaction_type)
            .query(`DELETE FROM EBM.SAPUploads WHERE TransactionType = @transaction_type`);

        console.log("-> Insertando Cabecera en SAPUploads...");
        await transaction.request()
            .input('id', sql.NVarChar(50), id)
            .input('transaction_type', sql.NVarChar(20), transaction_type)
            .input('upload_date', sql.DateTime, new Date(upload_date))
            .input('uploaded_by', sql.NVarChar(100), uploaded_by)
            .input('data', sql.NVarChar(sql.MAX), '[]')
            .query(`
                INSERT INTO EBM.SAPUploads (Id, TransactionType, UploadDate, UploadedBy, Data)
                VALUES (@id, @transaction_type, @upload_date, @uploaded_by, @data)
            `);

        console.log("-> Preparando Bulk Insert...");
        const bulkReq = new sql.Request(transaction);
        const tvp = createSapMe2kTable();
        for (const row of data) {
            tvp.rows.add(
                id,
                String(row.po_number || '').trim().substring(0, 50) || null,
                String(row.cost_center || '').trim() || null,
                String(row.gl_account || '').trim().substring(0, 50) || null,
                String(row.vendor_id || '').trim().substring(0, 150) || null,
                String(row.description || '').trim().substring(0, 500) || null,
                Number(row.order_value) || 0,
                Number(row.net_price) || 0,
                Number(row.quantity) || 0,
                String(row.currency || 'PEN').toUpperCase().substring(0, 10),
                String(row.release_status || '').trim().substring(0, 50) || null,
                String(row.release_strategy || '').trim().substring(0, 50) || null
            );
        }

        console.log("-> Lanzando Bulk...");
        if (tvp.rows.length > 0) await bulkReq.bulk(tvp);

        console.log("-> Commit...");
        await transaction.commit();
        console.log("Simulacion completa con exito.");
        process.exit(0);

    } catch (error: any) {
        await transaction.rollback();
        console.error("!ERROR ATRAPADO EN TRANSACCION!");
        console.error(error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testUploadTransaction();
