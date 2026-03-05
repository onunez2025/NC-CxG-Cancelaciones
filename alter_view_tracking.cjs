const sql = require('mssql');
require('dotenv').config();

async function alterView() {
    const pool = await sql.connect({
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER, database: process.env.DB_DATABASE,
        options: { encrypt: true, trustServerCertificate: true }
    });

    await pool.request().query(`
        ALTER VIEW EBM.vw_EBM_Tracking AS
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
            WHERE DocType IN ('01','XK')
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
            REPLACE(M.VendorId, SUBSTRING(M.VendorId, 1, PATINDEX('%[^0-9]%', M.VendorId + 'A') - 1), '') AS VendorNameStr,
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

    console.log('✅ Vista vw_EBM_Tracking actualizada con filtro DocType IN (01, XK)');
    process.exit(0);
}
alterView().catch(e => { console.error(e); process.exit(1); });
