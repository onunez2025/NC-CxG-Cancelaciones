import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDbConnection } from '../db.js';
import { addInput, sql } from '../lib/db.js';

const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? 'FAIL' : 'fallback_development_secret_do_not_use');

if (isProduction && JWT_SECRET === 'FAIL') {
    throw new Error('CRITICAL FATAL ERROR: JWT_SECRET environment variable is completely missing in Production. The server refuses to start insecurely.');
}

interface JwtUserPayload {
    id: string;
    role_id: number;
    role_name: string;
    management_id: number | null;
    username: string;
    full_name?: string;
    permissions: string[];
    apps: string;
    iat?: number;
    exp?: number;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: JwtUserPayload;
        }
    }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    // Check Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1]; // Format is "Bearer <token>"
    if (!token) {
        return res.status(401).json({ error: 'Access denied. Malformed token.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded as JwtUserPayload;
        next();
    } catch (_err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

export async function logAudit(req: Request, action: string, entity: string, entityId: string, details: unknown) {
    try {
        const user = req.user;
        if (!user) return;
        const pool = await getDbConnection();
        const r = pool.request();
        addInput(r, 'uid', sql.UniqueIdentifier, user.id);
        addInput(r, 'un', sql.NVarChar(200), user.full_name || user.username);
        addInput(r, 'acc', sql.NVarChar(100), action);
        addInput(r, 'ent', sql.NVarChar(200), entity);
        addInput(r, 'eid', sql.NVarChar(200), entityId);
        addInput(r, 'det', sql.NVarChar(sql.MAX), JSON.stringify(details));
        await r.query(`
                INSERT INTO [dbo].[GAC_APP_TB_AUDIT_LOG]
                (UsuarioID, UsuarioNombre, Accion, Entidad, EntidadID, Detalle, Fecha)
                VALUES (@uid, @un, @acc, @ent, @eid, @det, GETDATE())
            `);
    } catch (logErr) {
        console.error('CRITICAL: Failed to log audit event:', logErr);
    }
}

export const verifyPermission = (permission: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Admin check
        const roleName = (user.role_name || '').trim().toLowerCase();
        if (roleName === 'administrador') {
            return next();
        }

        const permissions = user.permissions || [];
        if (permissions.includes(permission)) {
            return next();
        }

        // LOG ACCESS DENIED
        await logAudit(req, 'ACCESO_DENEGADO', `Endpoint: ${req.method} ${req.baseUrl}${req.path}`, permission, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            params: req.params,
            query: req.query
        });

        return res.status(403).json({ error: `Permission denied: ${permission}` });
    };
};
