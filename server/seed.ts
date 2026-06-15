import { getDbConnection } from './db.js';
import { addInput, sql } from './lib/db.js';

// Deterministic UUIDs for seeding
const ROLES = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Administrador' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Visualizador' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Gerente' },
    { id: '44444444-4444-4444-4444-444444444444', name: 'Analista' }
];

const MANAGEMENTS = [
    { id: '55555555-5555-5555-5555-555555555555', name: 'Tecnología', code: 'IT' },
    { id: '66666666-6666-6666-6666-666666666666', name: 'Finanzas', code: 'FIN' },
    { id: '77777777-7777-7777-7777-777777777777', name: 'Recursos Humanos', code: 'HR' }
];

async function seed() {
    try {
        console.log('Connecting to database...');
        const pool = await getDbConnection();

        // 1. Roles
        console.log('Seeding Roles...');
        for (const role of ROLES) {
            const r = pool.request();
            addInput(r, 'id', sql.UniqueIdentifier, role.id);
            addInput(r, 'name', sql.NVarChar(200), role.name);
            await r.query(`
                    IF NOT EXISTS (SELECT * FROM EBM.Roles WHERE Id = @id)
                    BEGIN
                        INSERT INTO EBM.Roles (Id, Name) VALUES (@id, @name);
                    END
                `);
        }

        // 2. Managements
        console.log('Seeding Managements...');
        for (const m of MANAGEMENTS) {
            const r = pool.request();
            addInput(r, 'id', sql.UniqueIdentifier, m.id);
            addInput(r, 'name', sql.NVarChar(200), m.name);
            addInput(r, 'code', sql.VarChar(50), m.code);
            await r.query(`
                    IF NOT EXISTS (SELECT * FROM EBM.Managements WHERE Id = @id)
                    BEGIN
                        INSERT INTO EBM.Managements (Id, Name, Code) VALUES (@id, @name, @code);
                    END
                `);
        }

        // 3. User
        console.log('Seeding Users...');
        const seedUserReq = pool.request();
        addInput(seedUserReq, 'roleId', sql.UniqueIdentifier, ROLES[0].id);
        addInput(seedUserReq, 'managementId', sql.UniqueIdentifier, MANAGEMENTS[0].id);
        await seedUserReq.query(`
            IF NOT EXISTS (SELECT * FROM EBM.Users WHERE Username = 'admin')
            BEGIN
                INSERT INTO EBM.Users (Username, Email, PasswordHash, RoleId, ManagementId, Language, Theme, IsActive) 
                VALUES ('admin', 'admin@example.com', 'admin', @roleId, @managementId, 'es', 'light', 1);
            END
        `);

        // 4. Accounts
        console.log('Seeding Accounts...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM EBM.AccountingAccounts WHERE Code = '600100')
            BEGIN
                INSERT INTO EBM.AccountingAccounts (Id, Code, Name, Category, IsActive) VALUES (NEWID(), '600100', 'Gastos de Viaje', 'expense', 1);
            END
        `);

        // 5. Cost Centers
        console.log('Seeding Cost Centers...');
        const mgmtId = MANAGEMENTS[0].id;
        const seedCecoReq = pool.request();
        addInput(seedCecoReq, 'mgmtId', sql.UniqueIdentifier, mgmtId);
        await seedCecoReq.query(`
            IF NOT EXISTS (SELECT * FROM EBM.CostCenters WHERE Code = '1001')
            BEGIN
                INSERT INTO EBM.CostCenters (Id, Code, Name, ManagementId, IsActive) VALUES (NEWID(), '1001', 'Desarrollo de Software', @mgmtId, 1);
            END
        `);

        console.log('Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seed();
