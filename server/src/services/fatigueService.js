import { redis } from '../config/redis.js';

/**
 * Using Redis ZSET for Sliding Window fatigue checks.
 */
export const checkFatigue = async (userId, category) => {
    const now = Date.now();
    const key = `fatigue:${userId}:${category}`;

    // Clean up old events (outside the 10-minute window)
    const windowStart = now - 600000; // 10 minutes
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count events in the last 10 minutes
    const count = await redis.zcount(key, '-inf', '+inf');

    // Level 1: > 5 alerts in 10 mins -> Demote
    if (count >= 5) {
        return { fatigue: true, level: 1, action: 'DEMOTE_TO_LATER' };
    }

    // Level 2: check hourly (demo)
    // ...

    return { fatigue: false };
};

export const recordEventForFatigue = async (userId, category) => {
    const key = `fatigue:${userId}:${category}`;
    await redis.zadd(key, Date.now(), `${Date.now()}-${userId}`);
    await redis.expire(key, 3600); // 1 hour max retention
};
