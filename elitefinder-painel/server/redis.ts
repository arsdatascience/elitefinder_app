import Redis from 'ioredis';

const redisUrl = process.env.REDIS_PUBLIC_URL || process.env.REDIS_URL;

if (!redisUrl) {
    console.warn('⚠️ REDIS_URL não definida. Cache sistema pode não funcionar.');
}

export const redis = new Redis(redisUrl || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on('connect', () => console.log('✅ Conectado ao Redis!'));
redis.on('error', (err) => console.error('❌ Erro no Redis:', err));
