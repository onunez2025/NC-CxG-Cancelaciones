import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? 'FAIL' : 'fallback_development_secret_do_not_use');

if (isProduction && JWT_SECRET === 'FAIL') {
    throw new Error('CRITICAL FATAL ERROR: JWT_SECRET environment variable is completely missing in Production. The server refuses to start insecurely.');
}

// Extending Request interface to hold the decoded user payload
declare global {
    namespace Express {
        interface Request {
            user?: any;
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
        req.user = decoded; // attach the parsed user object from token to the request
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};
