import { getDbConnection } from './server/db.js';
import { createSapMe2kTable } from './server/utils/sapParser.js';
import sql from 'mssql';

async function testBulk() {
    try {
        const pool = await getDbConnection();
        const tvp = createSapMe2kTable();
        // UploadId exist fake
        tvp.rows.add(
            'FAKE_UPLOAD_ID',
            'PO123',
            'MT050002',
            '12345',
            'V123',
            'Test Desc',
            100.0,
            10.0,
            10.0,
            'PEN',
            'A',
            'S1'
        );
        console.log("Intentando bulk...");
        const req = new sql.Request(pool);
        await req.bulk(tvp);
        console.log("Bulk exitoso!");
        process.exit(0);
    } catch (e: any) {
        console.error("Bulk falló:", e.message);
        process.exit(1);
    }
}
testBulk();
