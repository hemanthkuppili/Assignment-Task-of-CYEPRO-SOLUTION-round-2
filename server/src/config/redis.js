// IN-MEMORY MOCK Redis
class MemoryRedis {
    constructor() {
        this.data = new Map();
        this.zsetData = new Map();
        this.setData = new Map();
        console.log('Redis: Logic running in [Memory-Simulation] mode');
    }
    async get(key) { return this.data.get(key) || null; }
    async set(key, value) { this.data.set(key, value); return 'OK'; }
    async del(key) { this.data.delete(key); return 1; }
    async expire(key, seconds) { return 1; }
    async sadd(key, member) {
        if (!this.setData.has(key)) this.setData.set(key, new Set());
        this.setData.get(key).add(member);
        return 1;
    }
    async smembers(key) { return Array.from(this.setData.get(key) || []); }
    async zadd(key, score, member) {
        if (!this.zsetData.has(key)) this.zsetData.set(key, []);
        this.zsetData.get(key).push({ score: Number(score), member });
        return 1;
    }
    async zremrangebyscore(key, min, max) { return 0; }
    async zcount(key, min, max) { return (this.zsetData.get(key) || []).length; }
    on(event, cb) { if (event === 'connect') setTimeout(cb, 10); if (event === 'error') { } }
    quit() { return Promise.resolve(); }
}

import { config } from './index.js';
import Redis from 'ioredis';

let isMock = false;
let redisInstance;

try {
    if (!config.redisUri) throw new Error('REDIS_URI is undefined or empty');

    // Naively prefix 'redis://' if it's missing but user provided host:port (common mistake)
    let connectionString = config.redisUri;
    if (!connectionString.startsWith('redis://') && !connectionString.startsWith('rediss://')) {
        connectionString = `redis://${connectionString}`;
    }

    redisInstance = new Redis(connectionString, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times) {
            if (times > 2) return null; // stop retrying after 2 attempts
            return 1000;
        }
    });

    redisInstance.on('error', (err) => {
        if (!isMock) {
            console.warn('Real Redis connection failed (Falling back to Memory Simulation):', err.message);
            isMock = true;
            redisInstance = new MemoryRedis();
        }
    });

    redisInstance.on('ready', () => {
        console.log('Redis: Successfully connected to Real Redis Cluster!');
    });

} catch (err) {
    console.warn('Redis Connection Failed (Falling back to Memory Simulation):', err.message);
    isMock = true;
    redisInstance = new MemoryRedis();
}

export const isRedisMock = () => isMock;
export const redis = redisInstance;
export default redisInstance;
