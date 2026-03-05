
import { getDbConnection } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    const pool = await getDbConnection();
    console.log('--- Actualizando Vista EBM.vw_SAPLineItemsUnified (Fix Solped Amounts) ---');

    try {
        await pool.request().query(`
            CREATE OR ALTER VIEW EBM.vw_SAPLineItemsUnified AS
            -- 1. ME5K + ME5A Consolidated (Committed)
            SELECT 
                'ME5K' as TransactionType,
                k.CostCenter as ceco,
                k.GlAccount as gl_account,
                CAST(NULL AS NVARCHAR(50)) as po_number,
                k.PrNumber as pr_number,
                k.VendorName as vendor,
                COALESCE(
                    NULLIF(k.NetValue, 0), 
                    NULLIF(a.TotalValue, 0), 
                    (ISNULL(a.Quantity, 0) * ISNULL(a.UnitPrice, 0))
                ) as val,
                k.Currency as currency,
                CAST(NULL AS DATETIME2) as doc_date,
                CAST(NULL AS DATETIME2) as posting_date,
                k.RequestDate as req_date,
                k.Description as description,
                CAST(NULL AS NVARCHAR(100)) as reference_doc,
                CAST(0 AS BIT) as IsReal,
                CAST(0 AS BIT) as IsOrdered,
                CAST(1 AS BIT) as IsCommitted
            FROM EBM.SAP_ME5K k
            LEFT JOIN EBM.SAP_ME5A a ON k.PrNumber = a.PrNumber AND k.CostCenter = a.CostCenter
            
            UNION ALL
            
            -- 2. ME5A fallback
            SELECT 
                'ME5A' as TransactionType,
                a.CostCenter as ceco,
                CAST(NULL AS NVARCHAR(50)) as gl_account,
                a.PoNumber as po_number,
                a.PrNumber as pr_number,
                a.VendorName as vendor,
                COALESCE(NULLIF(a.TotalValue, 0), (ISNULL(a.Quantity, 0) * ISNULL(a.UnitPrice, 0))) as val,
                a.Currency as currency,
                CAST(NULL AS DATETIME2) as doc_date,
                CAST(NULL AS DATETIME2) as posting_date,
                a.RequestDate as req_date,
                a.Description as description,
                CAST(NULL AS NVARCHAR(100)) as reference_doc,
                CAST(0 AS BIT) as IsReal,
                CAST(0 AS BIT) as IsOrdered,
                CAST(1 AS BIT) as IsCommitted
            FROM EBM.SAP_ME5A a
            WHERE NOT EXISTS (SELECT 1 FROM EBM.SAP_ME5K k WHERE k.PrNumber = a.PrNumber AND k.CostCenter = a.CostCenter)
            
            UNION ALL
            
            -- 3. ME2K (Ordered)
            SELECT 
                'ME2K' as TransactionType,
                CostCenter as ceco,
                GlAccount as gl_account,
                PoNumber as po_number,
                CAST(NULL AS NVARCHAR(50)) as pr_number,
                VendorId as vendor,
                CASE 
                    WHEN OrderValue IS NOT NULL AND OrderValue > 0 THEN OrderValue 
                    ELSE (ISNULL(NetPrice, 0) * ISNULL(Quantity, 0)) 
                END as val,
                Currency as currency,
                CAST(NULL AS DATETIME2) as doc_date,
                CAST(NULL AS DATETIME2) as posting_date,
                CAST(NULL AS DATETIME2) as req_date,
                Description as description,
                CAST(NULL AS NVARCHAR(100)) as reference_doc,
                CAST(0 AS BIT) as IsReal,
                CAST(1 AS BIT) as IsOrdered,
                CAST(0 AS BIT) as IsCommitted
            FROM EBM.SAP_ME2K
            
            UNION ALL
            
            -- 4. KSB1 (Real)
            SELECT 
                'KSB1' as TransactionType,
                CostCenter as ceco,
                CostElement as gl_account,
                PoNumber as po_number,
                CAST(NULL AS NVARCHAR(50)) as pr_number,
                CAST(NULL AS NVARCHAR(150)) as vendor,
                Amount as val,
                'PEN' as currency,
                CAST(NULL AS DATETIME2) as doc_date,
                PostingDate as posting_date,
                CAST(NULL AS DATETIME2) as req_date,
                Description as description,
                ReferenceDoc as reference_doc,
                CAST(1 AS BIT) as IsReal,
                CAST(0 AS BIT) as IsOrdered,
                CAST(0 AS BIT) as IsCommitted
            FROM EBM.SAP_KSB1
        `);
        console.log('✅ Vista EBM.vw_SAPLineItemsUnified actualizada con éxito.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error actualizando vista unificada:', err);
        process.exit(1);
    }
}

migrate();
