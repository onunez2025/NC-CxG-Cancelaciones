import { getDbConnection } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

export async function setupSapViews() {
    const pool = await getDbConnection();
    console.log('--- Iniciando creación de Vistas SQL Relacionales ---');

    try {
        // VISTA PARA TRACKING COMPLETO DE PEDIDOS
        // Cruza ME2K como pivote principal, enlazado con ME5K, KSB1 y FBL1N usando SUM()
        await pool.request().query(`
            CREATE OR ALTER VIEW EBM.vw_EBM_Tracking AS
            WITH me2k_grouped AS (
                SELECT 
                    PoNumber, 
                    MAX(CostCenter) AS CostCenter, 
                    MAX(VendorId) AS VendorId, 
                    MAX(Description) AS Description, 
                    MAX(Currency) AS Currency,
                    SUM(OrderValue) AS OrderValue,
                    SUM(NetPrice * Quantity) AS CalculatedValue
                FROM EBM.SAP_ME2K
                GROUP BY PoNumber
            ),
            ksb1_totals AS (
                SELECT PoNumber, SUM(Amount) AS TotalRealExpense
                FROM EBM.SAP_KSB1
                GROUP BY PoNumber
            ),
            fbl1n_totals AS (
                SELECT 
                    PoNumber, 
                    SUM(AmountLocal) AS TotalInvoiced,
                    SUM(CASE WHEN ClearingDoc IS NOT NULL AND ClearingDoc != '' THEN AmountLocal ELSE 0 END) AS TotalPaid
                FROM EBM.SAP_FBL1N
                GROUP BY PoNumber
            ),
            me5k_first AS (
                SELECT 
                    PoNumber,
                    MAX(PrNumber) AS PrNumber,
                    MAX(RequestDate) AS RequestDate,
                    MAX(ReleaseDate) AS ReleaseDate,
                    MAX(GlAccount) AS GlAccount
                FROM EBM.SAP_ME5K
                GROUP BY PoNumber
            )
            SELECT 
                M.PoNumber,
                M.CostCenter,
                M.VendorId,
                REPLACE(M.VendorId, SUBSTRING(M.VendorId, 1, PATINDEX('%[^0-9]%', M.VendorId + 'A') - 1), '') AS VendorNameStr, -- Clean VendorName loosely
                M.Description,
                CASE WHEN M.OrderValue > 0 THEN M.OrderValue ELSE M.CalculatedValue END AS PoValue,
                M.Currency,
                K.TotalRealExpense,
                F.TotalInvoiced,
                F.TotalPaid,
                S.PrNumber,
                S.RequestDate,
                S.ReleaseDate,
                S.GlAccount
            FROM me2k_grouped M
            LEFT JOIN ksb1_totals K ON M.PoNumber = K.PoNumber
            LEFT JOIN fbl1n_totals F ON M.PoNumber = F.PoNumber
            LEFT JOIN me5k_first S ON M.PoNumber = S.PoNumber
        `);
        console.log('Vista EBM.vw_EBM_Tracking creada.');

        // VISTA PARA SOLPEDS (vw_EBM_Solped)
        await pool.request().query(`
            CREATE OR ALTER VIEW EBM.vw_EBM_Solped AS
            -- ME5K is the authoritative source for Solped data. 
            -- ME5A is only used as a fallback for PrNumbers not found in ME5K.
            WITH me5k_grouped AS (
                SELECT
                    PrNumber,
                    MAX(CostCenter)    AS CostCenter,
                    MIN(RequestDate)   AS RequestDate,
                    MAX(ReleaseDate)   AS ReleaseDate,
                    MAX(Currency)      AS Currency,
                    MAX(Description)   AS Description,
                    SUM(NetValue)      AS Value,
                    MAX(Quantity)      AS Quantity,
                    MAX(VendorName)    AS VendorName,
                    MAX(GlAccount)     AS GlAccount,
                    'ME5K'             AS Source
                FROM EBM.SAP_ME5K
                GROUP BY PrNumber
            ),
            me5a_grouped AS (
                SELECT
                    PrNumber,
                    MAX(CostCenter)    AS CostCenter,
                    MIN(RequestDate)   AS RequestDate,
                    MAX(ReleaseDate)   AS ReleaseDate,
                    MAX(Currency)      AS Currency,
                    MAX(Description)   AS Description,
                    SUM(TotalValue)    AS Value,
                    MAX(Quantity)      AS Quantity,
                    MAX(VendorName)    AS VendorName,
                    NULL               AS GlAccount,
                    'ME5A'             AS Source
                FROM EBM.SAP_ME5A
                -- Only include rows whose PrNumber does NOT appear in ME5K
                WHERE PrNumber NOT IN (SELECT DISTINCT PrNumber FROM EBM.SAP_ME5K WHERE PrNumber IS NOT NULL)
                GROUP BY PrNumber
            ),
            combined AS (
                SELECT * FROM me5k_grouped
                UNION ALL
                SELECT * FROM me5a_grouped
            ),
            me2k_po AS (
                SELECT K.PrNumber, MAX(M.PoNumber) AS PoNumber, SUM(M.OrderValue) AS PoValue
                FROM EBM.SAP_ME2K M
                JOIN EBM.SAP_ME5K K ON M.PoNumber = K.PoNumber
                GROUP BY K.PrNumber
            )
            SELECT
                S.PrNumber,
                S.CostCenter,
                S.Description,
                S.Value,
                S.Quantity,
                S.Currency,
                S.VendorName,
                S.GlAccount,
                S.RequestDate,
                S.ReleaseDate,
                P.PoNumber,
                P.PoValue,
                CASE WHEN P.PoNumber IS NOT NULL THEN 'pedido' ELSE 'solicitado' END AS Status
            FROM combined S
            LEFT JOIN me2k_po P ON S.PrNumber = P.PrNumber
        `);
        console.log('Vista EBM.vw_EBM_Solped creada.');

        // VISTA PARA PROVEEDORES (vw_EBM_Vendor)
        await pool.request().query(`
            CREATE OR ALTER VIEW EBM.vw_EBM_Vendor AS
            WITH vendor_fbl1n AS (
                SELECT 
                    VendorId,
                    SUM(AmountLocal) AS TotalInvoiced,
                    SUM(CASE WHEN ClearingDoc IS NOT NULL AND ClearingDoc != '' THEN AmountLocal ELSE 0 END) AS TotalPaid
                FROM EBM.SAP_FBL1N
                GROUP BY VendorId
            ),
            vendor_me2k AS (
                SELECT 
                    VendorId,
                    COUNT(DISTINCT PoNumber) AS TotalPos,
                    SUM(OrderValue) AS TotalGenerated
                FROM EBM.SAP_ME2K
                GROUP BY VendorId
            )
            SELECT
                COALESCE(F.VendorId, M.VendorId) AS VendorCode,
                REPLACE(COALESCE(F.VendorId, M.VendorId), SUBSTRING(COALESCE(F.VendorId, M.VendorId), 1, PATINDEX('%[^0-9]%', COALESCE(F.VendorId, M.VendorId) + 'A') - 1), '') AS VendorName,
                ISNULL(M.TotalGenerated, 0) AS TotalGenerated,
                ISNULL(F.TotalInvoiced, 0) AS TotalInvoiced,
                ISNULL(F.TotalPaid, 0) AS TotalPaid,
                ISNULL(M.TotalPos, 0) AS TotalPos
            FROM vendor_fbl1n F
            FULL OUTER JOIN vendor_me2k M ON F.VendorId = M.VendorId
            WHERE COALESCE(F.VendorId, M.VendorId) IS NOT NULL AND COALESCE(F.VendorId, M.VendorId) != ''
        `);
        console.log('Vista EBM.vw_EBM_Vendor creada.');

        console.log('✔ Todas las vistas SAP creadas correctamente.');
        return;

    } catch (err) {
        console.error('Error creando vistas SAP:', err);
        throw err;
    }
}

// Only auto-run when called directly as a migration script
// (not when imported by index.ts)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename.replace('.ts', '.js')) {
    setupSapViews();
}
