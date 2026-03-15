const config = require('../config');

let client = null;
const memoryStore = new Map();

const getRedisClient = () => {
    if (config.redis.url && !client) {
        try {
            const Redis = require('ioredis');
            client = new Redis(config.redis.url, {
                maxRetriesPerRequest: 2,
                retryStrategy: (times) => (times <= 2 ? 500 : null),
                lazyConnect: true,
            });
            client.on('error', (err) => {
                const { logger } = require('./logger');
                logger.warn('[Cache] Redis error', { err });
            });
        } catch (err) {
            client = null;
        }
    }
    return client;
};

const get = async (key) => {
    const redis = getRedisClient();
    if (redis) {
        try {
            const raw = await redis.get(key);
            if (raw == null) return null;
            try {
                return JSON.parse(raw);
            } catch {
                return raw;
            }
        } catch {
            return null;
        }
    }
    const entry = memoryStore.get(key);
    if (!entry || (entry.expiresAt && Date.now() > entry.expiresAt)) {
        if (entry) memoryStore.delete(key);
        return null;
    }
    return entry.value;
};

const set = async (key, value, ttlSeconds) => {
    const ttl = ttlSeconds ?? config.redis.defaultTtlSeconds;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    const redis = getRedisClient();
    if (redis) {
        try {
            if (ttl > 0) {
                await redis.setex(key, ttl, serialized);
            } else {
                await redis.set(key, serialized);
            }
            return;
        } catch {}
    }
    memoryStore.set(key, {
        value: typeof value === 'string' ? value : JSON.parse(serialized),
        expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : null,
    });
};

const invalidateByPrefix = async (prefix) => {
    const redis = getRedisClient();
    if (redis) {
        try {
            const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
            const pipeline = redis.pipeline();
            let count = 0;

            await new Promise((resolve, reject) => {
                stream.on('data', (keys) => {
                    for (const key of keys) {
                        pipeline.del(key);
                        count++;
                    }
                });
                stream.on('end', () => {
                    if (count > 0) {
                        pipeline.exec().then(resolve).catch(reject);
                    } else {
                        resolve();
                    }
                });
                stream.on('error', reject);
            });
            return;
        } catch {}
    }
    for (const key of [...memoryStore.keys()]) {
        if (key.startsWith(prefix)) memoryStore.delete(key);
    }
};

module.exports = {
    get,
    set,
    invalidateByPrefix,
    defaultTtl: config.redis.defaultTtlSeconds,
};
