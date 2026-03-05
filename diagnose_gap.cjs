
const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

async function diagnose() {
    try {
        await sql.connect(config);

        console.log('--- BUSCANDO GERENCIA ATC (MT050004 - LIMA) ---');
        const cecoCode = 'MT050004';

        // 1. Ver qué hay en KSB1 para este CeCo
        console.log('\n--- KSB1 (Real) Summary for MT050004 ---');
        const ksbSummary = await sql.query(`
            SELECT CostElement, SUM(Amount) as TotalReal 
            FROM EBM.SAP_KSB1 
            WHERE CostCenter = '${cecoCode}' 
            GROUP BY CostElement 
            ORDER BY TotalReal DESC
        `);
        console.table(ksbSummary.recordset);

        // 2. Ver si esos KSB1 tienen PO (Orden de Compra)
        console.log('\n--- KSB1 Items WITH vs WITHOUT PO ---');
        const ksbPoCheck = await sql.query(`
            SELECT 
                CASE WHEN PoNumber IS NOT NULL AND PoNumber != '' THEN 'WITH PO' ELSE 'WITHOUT PO' END as HasPo,
                COUNT(*) as Count, 
                SUM(Amount) as TotalAmount
            FROM EBM.SAP_KSB1 
            WHERE CostCenter = '${cecoCode}'
            GROUP BY CASE WHEN PoNumber IS NOT NULL AND PoNumber != '' THEN 'WITH PO' ELSE 'WITHOUT PO' END
        `);
        console.table(ksbPoCheck.recordset);

        // 3. Ver qué hay en ME2K (Ordenado) para este CeCo
        console.log('\n--- ME2K (Ordered) Summary for MT050004 ---');
        const me2kSummary = await sql.query(`
            SELECT GlAccount, SUM(OrderValue) as TotalOrdered 
            FROM EBM.SAP_ME2K 
            WHERE CostCenter = '${cecoCode}' 
            GROUP BY GlAccount
        `);
        console.table(me2kSummary.recordset);

        // 4. Ver qué hay en ME5K/A (Comprometido) para este CeCo
        console.log('\n--- ME5K/A (Committed) Summary for MT050004 ---');
        const me5Summary = await sql.query(`
            SELECT GlAccount, SUM(NetValue) as TotalCommitted
            FROM EBM.SAP_ME5K 
            WHERE CostCenter = '${cecoCode}'
            GROUP BY GlAccount
        `);
        console.table(me5Summary.recordset);

        // 5. Investigar "Servicio Técnico" (Account 639921000)
        console.log('\n--- DETALLE DE SERVICIO TÉCNICO (639921000) ---');
        const stDetail = await sql.query(`
            SELECT 'KSB1' as Source, PoNumber, ReferenceDoc, Amount, PostingDate, Description 
            FROM EBM.SAP_KSB1 
            WHERE CostCenter = '${cecoCode}' AND CostElement = '639921000'
            UNION ALL
            SELECT 'ME2K' as Source, PoNumber, CAST(NULL AS NVARCHAR(100)), OrderValue, CAST(NULL AS DATETIME2), Description
            FROM EBM.SAP_ME2K
            WHERE CostCenter = '${cecoCode}' AND GlAccount = '639921000'
        `);
        console.table(stDetail.recordset);

    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

diagnose();
