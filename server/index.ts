import { safeError } from './lib/security.js';
﻿import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient, blacklistToken } from './lib/redis.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDbConnection } from './db.js'; // Ensure extension when running under tsx module resolution
import { addInput, sql } from './lib/db.js';

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

const app = express();
const port = process.env.PORT || 3001;

// Trust the reverse proxy (EasyPanel uses Traefik/Caddy)
// Required for express-rate-limit to read correct IP addresses from 'X-Forwarded-For' headers
app.set('trust proxy', 1);

// Middlewares
// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
            frameAncestors: ["'none'"],
            formAction: ["'self'"],
            baseUri: ["'self'"],
        }
    }
}));

// Rate limiting — store en Redis para persistir contadores ante reinicios
const redisStore = () => new RedisStore({
    sendCommand: (...args: string[]) => (getRedisClient() as any).call(...args) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    prefix: 'rl:cxg:',
});
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    store: redisStore(),
    message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use(limiter);
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    store: redisStore(),
    message: { error: 'Too many login attempts, please try again after an hour.' },
});
app.use('/api/auth/login', authLimiter);

// CORS Validation
app.use(cors({
    origin: (origin, callback) => {
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`Blocked CORS attempt from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

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
    } catch (error: unknown) {
        // Obfuscate internal error in production
        const dbErrMsg = process.env.NODE_ENV === 'production' ? 'Database connection failed' : error.message;
        res.status(500).json({
            status: 'error',
            message: 'Failed to connect to Azure SQL.',
            error: dbErrMsg
        });
    }
});

// API Routes
app.use('/api/managements', verifyToken, managementsRouter);
app.use('/api/cost-centers', verifyToken, costCentersRouter);
app.use('/api/accounts', verifyToken, accountsRouter);
app.use('/api/roles', verifyToken, verifyPermission('ebm.config.roles'), rolesRouter);
app.use('/api/users', verifyToken, verifyPermission('ebm.config.users'), usersRouter);
app.use('/api/auth', authRouter);
app.post('/api/auth/logout', verifyToken, async (req: Request, res: Response) => {
    const token = req.headers['authorization']!.split(' ')[1];
    await blacklistToken(token, (req.user as any).exp ?? 0); // eslint-disable-line @typescript-eslint/no-explicit-any
    res.json({ message: 'Sesión cerrada correctamente.' });
});
app.get('/api/applications', verifyToken, async (req: Request, res: Response) => {
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
    } catch (err: unknown) {
        res.status(500).json({ error: safeError(err) });
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
    } catch (error: unknown) {
        res.status(500).json({ error: safeError(error) });
    }
});

app.post('/api/config/audit-logs', verifyToken, async (req: Request, res: Response) => {
    try {
        const { Accion, Entidad, EntidadID, Detalle } = req.body;
        const UsuarioID = String(req.user?.id || '');
        const UsuarioNombre = req.user?.full_name || req.user?.username || '';

        // Validation
        if (!UsuarioID || !Accion || !Entidad || !EntidadID) {
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
    } catch (error: unknown) {
        console.error('Error creating audit log:', error);
        res.status(500).json({ error: safeError(error) });
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

if (process.env.NODE_ENV === 'production' && !(process.env.ALLOWED_ORIGINS || '').trim()) {
    console.warn('⚠️  WARNING: ALLOWED_ORIGINS is not set. CORS will block all cross-origin requests in production.');
}

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message });
});

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
        const r = pool.request();
        addInput(r, 'code', sql.VarChar(50), APP_CODE);
        const result = await r.query(`SELECT Label, LogoUrl, Url FROM [dbo].[GAC_APP_TB_CONSOLE_APPLICATIONS] WHERE UPPER(Code) = UPPER(@code)`);
        if (result.recordset.length > 0) {
            const row = result.recordset[0];
            appMeta = { label: row.Label, logoUrl: row.LogoUrl, url: row.Url };
            console.log(`[AppConfig] Loaded meta for ${APP_CODE}: ${appMeta.label}`);
        }
    } catch (err: unknown) {
        console.warn('[AppConfig] Could not fetch app meta from DB:', err.message);
    }
}
