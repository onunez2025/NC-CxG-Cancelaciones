import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
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
import { verifyToken } from './middleware/auth.js';

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
        // In local development or if not strictly defined, we can be more permissive.
        if (process.env.NODE_ENV !== 'production') return callback(null, true);

        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`Blocked CORS attempt from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/managements', verifyToken, managementsRouter);
app.use('/api/cost-centers', verifyToken, costCentersRouter);
app.use('/api/accounts', verifyToken, accountsRouter);
app.use('/api/roles', verifyToken, rolesRouter);
app.use('/api/users', verifyToken, usersRouter);
app.use('/api/auth', authRouter); // protect /me internally
app.use('/api/budgets', verifyToken, budgetsRouter);
app.use('/api/sap/uploads', verifyToken, sapRouter);
app.use('/api/sap/cross-reference', verifyToken, crossReferenceRouter);

// Main test route
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

// Serve frontend in production (Docker image)
if (process.env.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../dist');
    app.use(express.static(staticPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(staticPath, 'index.html'));
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

    // Pre-warm the SAP cross-reference cache in background
    prewarmCache().catch(err => console.error('[Cache] Pre-warm error on startup:', err));
});
