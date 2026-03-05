import dotenv from 'dotenv';
import { getDbConnection } from './db.js';

dotenv.config();

const SCHEMAS_AND_TABLES = `
-- 1. Create Schema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'EBM')
BEGIN
    EXEC('CREATE SCHEMA EBM');
END

-- 2. Create Managements
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.Managements'))
BEGIN
    CREATE TABLE EBM.Managements (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(100) NOT NULL,
        Code NVARCHAR(20) NOT NULL UNIQUE
    );
END

-- 3. Create CostCenters
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.CostCenters'))
BEGIN
    CREATE TABLE EBM.CostCenters (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Code NVARCHAR(50) NOT NULL UNIQUE,
        Name NVARCHAR(150) NOT NULL,
        ManagementId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.Managements(Id),
        IsActive BIT NOT NULL DEFAULT 1
    );
END

-- 4. Create AccountingAccounts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.AccountingAccounts'))
BEGIN
    CREATE TABLE EBM.AccountingAccounts (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Code NVARCHAR(50) NOT NULL UNIQUE,
        Name NVARCHAR(150) NOT NULL,
        Category NVARCHAR(50) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1
    );
END

-- 5. Create Roles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.Roles'))
BEGIN
    CREATE TABLE EBM.Roles (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(50) NOT NULL UNIQUE
    );
END

-- 6. Create Users
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.Users'))
BEGIN
    CREATE TABLE EBM.Users (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Username NVARCHAR(50) NOT NULL UNIQUE,
        Email NVARCHAR(100) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(256),
        RoleId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.Roles(Id),
        ManagementId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.Managements(Id),
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        Language NVARCHAR(5) NOT NULL DEFAULT 'es',
        Theme NVARCHAR(10) NOT NULL DEFAULT 'light',
        AvatarUrl NVARCHAR(MAX) NULL
    );
END

-- 7. Create RolePermissions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.RolePermissions'))
BEGIN
    CREATE TABLE EBM.RolePermissions (
        RoleId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.Roles(Id),
        Permission NVARCHAR(100) NOT NULL,
        PRIMARY KEY (RoleId, Permission)
    );
END

-- 8. Create Budgets
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.Budgets'))
BEGIN
    CREATE TABLE EBM.Budgets (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Year INT NOT NULL,
        AccountId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.AccountingAccounts(Id),
        ManagementId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.Managements(Id),
        CostCenterId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.CostCenters(Id),
        Total DECIMAL(18,2) NOT NULL DEFAULT 0,
        CreatedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.Users(Id),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UNIQUE(Year, AccountId, CostCenterId)
    );
END

-- 9. Create BudgetMonths
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.BudgetMonths'))
BEGIN
    CREATE TABLE EBM.BudgetMonths (
        BudgetId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.Budgets(Id) ON DELETE CASCADE,
        MonthIndex INT NOT NULL CHECK (MonthIndex BETWEEN 0 AND 11),
        Amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        PRIMARY KEY (BudgetId, MonthIndex)
    );
END

-- 10. Create Solpeds
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.Solpeds'))
BEGIN
    CREATE TABLE EBM.Solpeds (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PrNumber NVARCHAR(50) NOT NULL,
        Description NVARCHAR(250) NOT NULL,
        AccountId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.AccountingAccounts(Id),
        CostCenterId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.CostCenters(Id),
        Amount DECIMAL(18,2) NOT NULL,
        Currency NVARCHAR(10) NOT NULL DEFAULT 'PEN',
        Status NVARCHAR(50) NOT NULL,
        VendorId NVARCHAR(50) NULL,
        VendorName NVARCHAR(150) NULL,
        PoNumber NVARCHAR(50) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.Users(Id),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END

-- 11. Create ExchangeRates
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.ExchangeRates'))
BEGIN
    CREATE TABLE EBM.ExchangeRates (
        Year INT NOT NULL,
        MonthIndex INT NOT NULL CHECK (MonthIndex BETWEEN 0 AND 11),
        Rate DECIMAL(10,4) NOT NULL DEFAULT 3.80,
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        PRIMARY KEY (Year, MonthIndex)
    );
END

-- 12. Create SAPUploads
IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID('EBM.SAPUploads'))
BEGIN
    CREATE TABLE EBM.SAPUploads (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        TransactionType NVARCHAR(20) NOT NULL,
        UploadDate DATETIME2 NOT NULL DEFAULT GETDATE(),
        UploadedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES EBM.Users(Id),
        RawData NVARCHAR(MAX) NOT NULL
    );
END
`;

async function setupDatabase() {
    try {
        console.log("Connecting to Azure SQL...");
        const pool = await getDbConnection();

        console.log("Executing DDL Schema provisioning...");
        await pool.request().query(SCHEMAS_AND_TABLES);

        console.log("-----------------------------------------");
        console.log("✅ SUCCESS: All tables created successfully!");
        console.log("-----------------------------------------");

        await pool.close();
        process.exit(0);
    } catch (err) {
        console.error("❌ ERROR: Failed to provision tables.", err);
        process.exit(1);
    }
}

setupDatabase();
