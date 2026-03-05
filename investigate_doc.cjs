const XLSX = require('xlsx');
const sql = require('mssql');
const path = require('path');
require('dotenv').config();

async function investigate() {
    // 1. Buscar en el Excel FBL1N (5).xlsx
    console.log('=== BUSCANDO EN EXCEL FBL1N (5).xlsx ===');
    const wb = XLSX.readFile(path.join(__dirname, 'sap_samples', 'FBL1N (5).xlsx'));
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    const headers = data[0];
    console.log('Headers:', headers);

    let found = false;
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const str = JSON.stringify(row || '');
        if (str.includes('100020429')) {
            console.log(`\nFila ${i + 1} en Excel:`, row);
            found = true;
        }
    }
    if (!found) {
        console.log('\n❌ Documento 100020429 NO ENCONTRADO en ninguna fila del Excel FBL1N (5).xlsx');
    }

    // 2. Buscar en la base de datos
    console.log('\n=== BUSCANDO EN BD: EBM.SAP_FBL1N ===');
    const pool = await sql.connect({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        options: { encrypt: true, trustServerCertificate: true }
    });

    const result = await pool.request().query(`
        SELECT * FROM EBM.SAP_FBL1N WHERE DocumentNumber LIKE '%100020429%'
    `);
    console.log('Registros en BD con DocumentNumber 100020429:', result.recordset.length);
    result.recordset.forEach(r => console.log(r));

    // 3. Buscar todas las facturas relacionadas con el pedido 4100106600
    console.log('\n=== FACTURAS EN BD CON PoNumber = 4100106600 ===');
    const result2 = await pool.request().query(`
        SELECT DocumentNumber, VendorId, PoNumber, Reference, Assignment, Description, AmountLocal 
        FROM EBM.SAP_FBL1N WHERE PoNumber = '4100106600'
    `);
    console.log('Total:', result2.recordset.length);
    result2.recordset.forEach(r => console.log(r));

    // 4. Buscar vendor 1000012509 en FBL1N
    console.log('\n=== FACTURAS EN BD CON VendorId = 1000012509 ===');
    const result3 = await pool.request().query(`
        SELECT DocumentNumber, VendorId, PoNumber, Reference, Assignment, Description, AmountLocal 
        FROM EBM.SAP_FBL1N WHERE VendorId = '1000012509'
    `);
    console.log('Total:', result3.recordset.length);
    result3.recordset.forEach(r => console.log(r));

    // 5. Buscar doc 100020429 en todas las tablas SAP
    console.log('\n=== BUSCANDO 100020429 EN TODAS LAS TABLAS SAP ===');
    for (const table of ['SAP_ME2K', 'SAP_ME5K', 'SAP_ME5A', 'SAP_KSB1']) {
        const r = await pool.request().query(`
            SELECT * FROM EBM.${table} WHERE CAST(ISNULL(PoNumber,'') AS VARCHAR(MAX)) LIKE '%100020429%'
                OR EXISTS (SELECT 1 FROM (SELECT * FROM EBM.${table} t2 FOR JSON PATH) AS sub(j) WHERE j LIKE '%100020429%')
        `).catch(() => ({ recordset: [] }));
        if (r.recordset.length > 0) {
            console.log(`  Encontrado en EBM.${table}:`, r.recordset.length, 'filas');
        }
    }

    process.exit(0);
}

investigate().catch(e => { console.error(e); process.exit(1); });
