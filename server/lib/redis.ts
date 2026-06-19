import Redis from 'ioredis';
import { createHash } from 'crypto';

let _redis: Redis | null = null;

export function getRedisClient(): Redis {
    if (!_redis) {
        _redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            lazyConnect: true,
            retryStrategy: (times) => Math.min(times * 100, 3000),
        });
        _redis.on('error', (err) => console.error('[Redis] Error:', err.message));
    }
    return _redis;
}

function tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
    try {
        return (await getRedisClient().exists(`bl:${tokenHash(token)}`)) === 1;
    } catch {
        return false;
    }
}

export async function blacklistToken(token: string, exp: number): Promise<void> {
    try {
        const ttl = Math.max(exp - Math.floor(Date.now() / 1000), 0);
        if (ttl > 0) await getRedisClient().set(`bl:${tokenHash(token)}`, '1', 'EX', ttl);
    } catch (err) {
        console.error('[Redis] Error al blacklistear token:', err);
    }
}
