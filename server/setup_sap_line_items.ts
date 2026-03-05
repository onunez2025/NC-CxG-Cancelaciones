import dotenv from 'dotenv';
import { getDbConnection } from './db.js';

dotenv.config();

const SETUP_SQL = `
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.SAPLineItems'))
BEGIN
    CREATE TABLE EBM.SAPLineItems (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UploadId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES EBM.SAPUploads(Id) ON DELETE CASCADE,
        TransactionType NVARCHAR(20) NOT NULL,
        
        -- Claves cruzadas
        CecoCode NVARCHAR(50) NULL,
        AccountCode NVARCHAR(50) NULL,
        PoNumber NVARCHAR(50) NULL,
        PrNumber NVARCHAR(50) NULL,
        VendorName NVARCHAR(150) NULL,
        
        -- Datos transaccionales
        Amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        Currency NVARCHAR(10) NOT NULL DEFAULT 'PEN',
        DocumentDate DATETIME2 NULL,
        PostingDate DATETIME2 NULL,
        RequestDate DATETIME2 NULL,
        
        -- Descripciones y refs
        Description NVARCHAR(500) NULL,
        ReferenceDoc NVARCHAR(100) NULL,
        
        -- Banderas
        IsReal BIT NOT NULL DEFAULT 0,
        IsOrdered BIT NOT NULL DEFAULT 0,
        IsCommitted BIT NOT NULL DEFAULT 0
    );

    CREATE NONCLUSTERED INDEX IX_SAPLineItems_UploadId ON EBM.SAPLineItems(UploadId);
    CREATE NONCLUSTERED INDEX IX_SAPLineItems_CecoAccount ON EBM.SAPLineItems(CecoCode, AccountCode);
END
`;

async function setup() {
    try {
        console.log("Connecting to Azure SQL to create SAPLineItems...");
        const pool = await getDbConnection();
        await pool.request().query(SETUP_SQL);
        console.log("Table EBM.SAPLineItems created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
}

setup();
