import { Request } from 'express';
import { getDbConnection } from '../db.js';

/**
 * Resolves the authenticated user's display name (FullName).
 * Seamlessly falls back to a database lookup if full_name is not present on the JWT payload (e.g. for existing active sessions).
 * Falls back to the username (or a custom fallback) and finally 'Sistema' if no user is authenticated.
 */
export async function getAuthenticatedUserDisplayName(req: Request, fallbackVal?: string): Promise<string> {
    if (req.user?.full_name) {
        return req.user.full_name;
    }
    if (req.user?.id) {
        try {
            const pool = await getDbConnection();
            const userResult = await pool.request()
                .input('id', req.user.id)
                .query('SELECT FullName FROM EBM.Users WHERE Id = @id');
            if (userResult.recordset.length > 0 && userResult.recordset[0].FullName) {
                return userResult.recordset[0].FullName;
            }
        } catch (err) {
            console.error('Error fetching FullName fallback from DB:', err);
        }
    }
    return req.user?.username || fallbackVal || 'Sistema';
}
