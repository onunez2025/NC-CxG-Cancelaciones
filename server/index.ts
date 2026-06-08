import express, { Request, Response } from 'express';
import cors from 'cors';
import sql from 'mssql';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDbConnection } from './db.js'; // Ensure extension when running under tsx module resolution

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Routers
import managementsRouter from './routes/managements.js';
import costCentersRouter from './routes/costCenters.js';
import accountsRouter from './routes/accounts.js';
import rolesRouter from './routes/roles.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';
import budgetsRouter from './routes/budgets.js';
import { sapRouter } from './routes/sap.js';
import { crossReferenceRouter, prewarmCache } from './routes/crossReference.js';
import ncRouter from './routes/nc.js';
import fsmRouter from './routes/fsm.js';
import specialCasesRouter from './routes/specialCases.js';
import emergenciasRouter from './routes/emergencias.js';
import programaSupervisoresRouter from './routes/programaSupervisores.js';
import { verifyToken, verifyPermission } from './middleware/auth.js';
import { setupSapViews } from './setup_sap_views.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Trust the reverse proxy (EasyPanel uses Traefik/Caddy)
// Required for express-rate-limit to read correct IP addresses from 'X-Forwarded-For' headers
app.set('trust proxy', 1);

// Middlewares
// Security headers
app.use(helmet({
    contentSecurityPolicy: false // Disabled temporarily to avoid breaking frontend assets if not fully configured
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15 minutes
    message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);

// Specific Auth route limiter for brute-force protection
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 login requests per hour
    message: { error: 'Too many login attempts, please try again after an hour.' }
});
app.use('/api/auth/login', authLimiter);

// CORS Validation
app.use(cors({
    origin: (origin, callback) => {
        // En producción, permitimos cualquier origen para evitar que el middleware de CORS 
        // intercepte y bloquee la carga de archivos estáticos (CSS/JS) con errores 500.
        callback(null, true);
    },
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Public Status Route (Health Check)
app.get('/api/status', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        // Just a simple ping query
        const result = await pool.request().query('SELECT @@VERSION as version, DB_NAME() as db');
        const count = await pool.request().query('SELECT COUNT(*) as c FROM EBM.SAP_ME2K');
        const solpedCount = await pool.request().query('SELECT COUNT(*) as c FROM EBM.vw_EBM_Solped');
        res.json({
            status: 'success',
            message: 'Successfully connected to Azure SQL Database!',
            server_version: result.recordset[0].version,
            db_connected: result.recordset[0].db,
            me2k_count: count.recordset[0].c,
            solped_view_count: solpedCount.recordset[0].c
        });
    } catch (error: any) {
        // Obfuscate internal error in production
        const safeError = process.env.NODE_ENV === 'production' ? 'Database connection failed' : error.message;
        res.status(500).json({
            status: 'error',
            message: 'Failed to connect to Azure SQL.',
            error: safeError
        });
    }
});

// API Routes
app.use('/api/managements', verifyToken, managementsRouter);
app.use('/api/cost-centers', verifyToken, costCentersRouter);
app.use('/api/accounts', verifyToken, accountsRouter);
app.use('/api/roles', verifyToken, verifyPermission('ebm.config.roles'), rolesRouter);
app.use('/api/users', verifyToken, verifyPermission('ebm.config.users'), usersRouter);
app.use('/api/auth', authRouter); // protect /me internally
app.get('/api/applications', async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const activeOnly = req.query.activeOnly === 'true';
        let query = 'SELECT Id as id, Code as code, Label as label, Url as url, LogoUrl as logo_url, CAST(IsActive AS BIT) as is_active, DisplayOrder as display_order FROM [dbo].[GAC_APP_TB_CONSOLE_APPLICATIONS]';
        if (activeOnly) {
            query += ' WHERE IsActive = 1';
        }
        query += ' ORDER BY DisplayOrder ASC';
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
app.use('/api/budgets', verifyToken, budgetsRouter);
app.use('/api/sap/uploads', verifyToken, verifyPermission('ebm.config.sap'), sapRouter);
app.use('/api/sap/cross-reference', verifyToken, crossReferenceRouter);
app.use('/api', verifyToken, ncRouter);
app.use('/api/fsm', verifyToken, fsmRouter);
app.use('/api/special-cases', verifyToken, specialCasesRouter);
app.use('/api/emergencias', verifyToken, emergenciasRouter);
app.use('/api/programa-supervisores', verifyToken, verifyPermission('cxg.programa_supervisores.view'), programaSupervisoresRouter);

// Security Audit Logs
app.get('/api/config/audit-logs', verifyToken, verifyPermission('ebm.config.users'), async (req: Request, res: Response) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT TOP 200 * 
            FROM [dbo].[GAC_APP_TB_AUDIT_LOG] 
            WHERE EntidadID LIKE 'ebm.%' OR Entidad LIKE '%EBM%'
            ORDER BY Fecha DESC
        `);
        res.json(result.recordset);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/config/audit-logs', verifyToken, async (req: Request, res: Response) => {
    try {
        const { UsuarioID, UsuarioNombre, Accion, Entidad, EntidadID, Detalle } = req.body;

        // Validation
        if (!UsuarioID || !UsuarioNombre || !Accion || !Entidad || !EntidadID) {
            return res.status(400).json({ error: 'Missing required audit log parameters' });
        }

        const pool = await getDbConnection();
        await pool.request()
            .input('UsuarioID', sql.VarChar(100), UsuarioID)
            .input('UsuarioNombre', sql.VarChar(255), UsuarioNombre)
            .input('Accion', sql.VarChar(50), Accion)
            .input('Entidad', sql.VarChar(100), Entidad)
            .input('EntidadID', sql.VarChar(100), EntidadID)
            .input('Detalle', sql.NVarChar(sql.MAX), Detalle || '')
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_AUDIT_LOG] 
                (Fecha, UsuarioID, UsuarioNombre, Accion, Entidad, EntidadID, Detalle)
                VALUES 
                (GETDATE(), @UsuarioID, @UsuarioNombre, @Accion, @Entidad, @EntidadID, @Detalle)
            `);

        res.status(201).json({ message: 'Audit log created successfully' });
    } catch (error: any) {
        console.error('Error creating audit log:', error);
        res.status(500).json({ error: error.message });
    }
});



// Serve frontend in production (Docker image)
if (process.env.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../dist');
    app.use(express.static(staticPath));
    app.use((req, res, next) => {
        if (!req.path.startsWith('/api')) {
            const indexPath = path.join(staticPath, 'index.html');
            try {
                let html = fs.readFileSync(indexPath, 'utf-8');
                if (appMeta) {
                    const ogTags = [
                        `<meta property="og:type" content="website" />`,
                        `<meta property="og:title" content="${appMeta.label} - SIATC" />`,
                        `<meta property="og:description" content="${appMeta.label} - Plataforma de gestión SIATC." />`,
                        `<meta property="og:image" content="${appMeta.logoUrl}" />`,
                        `<meta property="og:url" content="${appMeta.url}" />`,
                        `<meta name="twitter:card" content="summary_large_image" />`,
                        `<meta name="twitter:title" content="${appMeta.label} - SIATC" />`,
                        `<meta name="twitter:image" content="${appMeta.logoUrl}" />`,
                        `<link rel="icon" type="image/png" href="${appMeta.logoUrl}" />`,
                    ].join('\n    ');
                    html = html.replace(/<meta property="og:[^"]+"[^>]*\/>/g, '');
                    html = html.replace(/<link rel="icon"[^>]*\/>/g, '');
                    html = html.replace('<title>', `${ogTags}\n  <title>`);
                }
                res.setHeader('Content-Type', 'text/html');
                res.send(html);
            } catch {
                res.sendFile(indexPath);
            }
        } else {
            next();
        }
    });
}

// Start the server
// Sanity check before starting
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET environment variable is missing.');
    process.exit(1);
}

app.listen(port, () => {
    console.log(`Backend Server listening on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Azure Status Check available at: http://localhost:${port}/api/status`);

    // Fetch app metadata from DB for OG tags
    fetchAppMeta();

    // Ensure SQL Views are always up-to-date (CREATE OR ALTER — idempotent)
    setupSapViews()
        .then(() => console.log('[Views] SQL Views initialized/updated.'))
        .catch(err => console.error('[Views] Failed to initialize SQL Views:', err));

    // Pre-warm the SAP cross-reference cache in background
    prewarmCache().catch(err => console.error('[Cache] Pre-warm error on startup:', err));
});

const APP_CODE = process.env.APP_CODE || 'CXG';

interface AppMeta { label: string; logoUrl: string; url: string; }
let appMeta: AppMeta | null = null;

async function fetchAppMeta(): Promise<void> {
    try {
        const pool = await getDbConnection();
        const result = await pool.request()
            .input('code', APP_CODE)
            .query(`SELECT Label, LogoUrl, Url FROM [dbo].[GAC_APP_TB_CONSOLE_APPLICATIONS] WHERE UPPER(Code) = UPPER(@code)`);
        if (result.recordset.length > 0) {
            const row = result.recordset[0];
            appMeta = { label: row.Label, logoUrl: row.LogoUrl, url: row.Url };
            console.log(`[AppConfig] Loaded meta for ${APP_CODE}: ${appMeta.label}`);
        }
    } catch (err: any) {
        console.warn('[AppConfig] Could not fetch app meta from DB:', err.message);
    }
}
