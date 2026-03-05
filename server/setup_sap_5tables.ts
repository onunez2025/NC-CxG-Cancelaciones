import { getDbConnection } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

async function setupSapTablas() {
    const pool = await getDbConnection();
    console.log('--- Iniciando creación de las 5 Tablas SAP ---');

    try {
        // 1. ME2K (Pedidos)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[EBM].[SAP_ME2K]') AND type in (N'U'))
            BEGIN
                CREATE TABLE EBM.SAP_ME2K (
                    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    UploadId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES EBM.SAPUploads(Id) ON DELETE CASCADE,
                    PoNumber NVARCHAR(50) NULL,
                    CostCenter NVARCHAR(50) NULL,
                    GlAccount NVARCHAR(50) NULL,
                    VendorId NVARCHAR(150) NULL,
                    Description NVARCHAR(500) NULL,
                    OrderValue DECIMAL(18,2) DEFAULT 0,
                    NetPrice DECIMAL(18,2) DEFAULT 0,
                    Quantity DECIMAL(18,2) DEFAULT 0,
                    Currency NVARCHAR(10) NULL,
                    ReleaseStatus NVARCHAR(50) NULL,
                    ReleaseStrategy NVARCHAR(50) NULL
                );
                CREATE INDEX IX_ME2K_PoNumber ON EBM.SAP_ME2K(PoNumber);
                CREATE INDEX IX_ME2K_CostCenter ON EBM.SAP_ME2K(CostCenter);
                PRINT 'Tabla EBM.SAP_ME2K creada.';
            END ELSE BEGIN
                PRINT 'Tabla EBM.SAP_ME2K ya existe.';
            END
        `);

        // 2. ME5K (Solicitudes de Pedido - Distribución de Costes)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[EBM].[SAP_ME5K]') AND type in (N'U'))
            BEGIN
                CREATE TABLE EBM.SAP_ME5K (
                    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    UploadId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES EBM.SAPUploads(Id) ON DELETE CASCADE,
                    PrNumber NVARCHAR(50) NULL,
                    PrItem NVARCHAR(50) NULL,
                    PoNumber NVARCHAR(50) NULL,
                    CostCenter NVARCHAR(50) NULL,
                    GlAccount NVARCHAR(50) NULL,
                    VendorName NVARCHAR(150) NULL,
                    Description NVARCHAR(500) NULL,
                    NetValue DECIMAL(18,2) DEFAULT 0,
                    Quantity DECIMAL(18,2) DEFAULT 0,
                    Currency NVARCHAR(10) NULL,
                    RequestDate DATETIME2 NULL,
                    ReleaseDate DATETIME2 NULL
                );
                CREATE INDEX IX_ME5K_PrNumber ON EBM.SAP_ME5K(PrNumber);
                CREATE INDEX IX_ME5K_PoNumber ON EBM.SAP_ME5K(PoNumber);
                CREATE INDEX IX_ME5K_CostCenter ON EBM.SAP_ME5K(CostCenter);
                PRINT 'Tabla EBM.SAP_ME5K creada.';
            END ELSE BEGIN
                PRINT 'Tabla EBM.SAP_ME5K ya existe.';
            END
        `);

        // 3. ME5A (Alcance de las Solicitudes - Solped General)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[EBM].[SAP_ME5A]') AND type in (N'U'))
            BEGIN
                CREATE TABLE EBM.SAP_ME5A (
                    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    UploadId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES EBM.SAPUploads(Id) ON DELETE CASCADE,
                    PrNumber NVARCHAR(50) NULL,
                    PrItem NVARCHAR(50) NULL,
                    PoNumber NVARCHAR(50) NULL,
                    CostCenter NVARCHAR(50) NULL, -- Referencia cruzada (puede venir vacio, se llena en BD)
                    Description NVARCHAR(500) NULL,
                    TotalValue DECIMAL(18,2) DEFAULT 0,
                    UnitPrice DECIMAL(18,2) DEFAULT 0,
                    Quantity DECIMAL(18,2) DEFAULT 0,
                    Currency NVARCHAR(10) NULL,
                    VendorName NVARCHAR(150) NULL,
                    CreatedBy NVARCHAR(150) NULL,
                    PoDate DATETIME2 NULL,
                    ReleaseDate DATETIME2 NULL,
                    RequestDate DATETIME2 NULL
                );
                CREATE INDEX IX_ME5A_PrNumber ON EBM.SAP_ME5A(PrNumber);
                CREATE INDEX IX_ME5A_PoNumber ON EBM.SAP_ME5A(PoNumber);
                PRINT 'Tabla EBM.SAP_ME5A creada.';
            END ELSE BEGIN
                PRINT 'Tabla EBM.SAP_ME5A ya existe.';
            END
        `);

        // 4. KSB1 (Gastos Reales por Centro de Coste)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[EBM].[SAP_KSB1]') AND type in (N'U'))
            BEGIN
                CREATE TABLE EBM.SAP_KSB1 (
                    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    UploadId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES EBM.SAPUploads(Id) ON DELETE CASCADE,
                    CostCenter NVARCHAR(50) NULL,
                    CostElement NVARCHAR(50) NULL,
                    CostElementName NVARCHAR(150) NULL,
                    Amount DECIMAL(18,2) DEFAULT 0,
                    PostingDate DATETIME2 NULL,
                    Description NVARCHAR(500) NULL,
                    ReferenceDoc NVARCHAR(100) NULL,
                    PoNumber NVARCHAR(50) NULL
                );
                CREATE INDEX IX_KSB1_PoNumber ON EBM.SAP_KSB1(PoNumber);
                CREATE INDEX IX_KSB1_CostCenter ON EBM.SAP_KSB1(CostCenter);
                PRINT 'Tabla EBM.SAP_KSB1 creada.';
            END ELSE BEGIN
                PRINT 'Tabla EBM.SAP_KSB1 ya existe.';
            END
        `);

        // 5. FBL1N (Partidas individuales de Acreedores - Facturas)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[EBM].[SAP_FBL1N]') AND type in (N'U'))
            BEGIN
                CREATE TABLE EBM.SAP_FBL1N (
                    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    UploadId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES EBM.SAPUploads(Id) ON DELETE CASCADE,
                    CostCenter NVARCHAR(50) NULL, -- Resolvible via query / upload
                    VendorId NVARCHAR(150) NULL,
                    DocumentNumber NVARCHAR(50) NULL,
                    DocType NVARCHAR(20) NULL,
                    PostingDate DATETIME2 NULL,
                    AmountLocal DECIMAL(18,2) DEFAULT 0,
                    CurrencyLocal NVARCHAR(10) NULL,
                    Reference NVARCHAR(100) NULL,
                    Assignment NVARCHAR(100) NULL,
                    Description NVARCHAR(500) NULL,
                    ClearingDoc NVARCHAR(50) NULL,
                    PoNumber NVARCHAR(50) NULL
                );
                CREATE INDEX IX_FBL1N_VendorId ON EBM.SAP_FBL1N(VendorId);
                CREATE INDEX IX_FBL1N_PoNumber ON EBM.SAP_FBL1N(PoNumber);
                CREATE INDEX IX_FBL1N_DocumentNumber ON EBM.SAP_FBL1N(DocumentNumber);
                PRINT 'Tabla EBM.SAP_FBL1N creada.';
            END ELSE BEGIN
                PRINT 'Tabla EBM.SAP_FBL1N ya existe.';
            END
        `);

        console.log('✔ Todas las tablas SAP creadas correctamente.');
        process.exit(0);

    } catch (err) {
        console.error('Error creando tablas SAP:', err);
        process.exit(1);
    }
}

setupSapTablas();
