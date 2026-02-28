import Redis from 'ioredis';
import { config } from './index.js';

export const redis = new Redis(config.redisUri, {
    maxRetriesPerRequest: null,
});

redis.on('connect', () => console.log('Redis: Connected'));
redis.on('error', (err) => console.error('Redis: Error', err));
