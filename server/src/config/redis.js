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
// We skip the real ioredis import if we want to avoid the crash entirely in restricted environments
// But we'll try to use it cautiously.

let redisInstance = new MemoryRedis();
export const isRedisMock = () => true;
export const redis = redisInstance;
export default redisInstance;
