package com.priorityengine.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class FatigueService {

    private final StringRedisTemplate redisTemplate;

    public boolean isUserFatigued(String userId, String category) {
        String key = "fatigue:" + userId + ":" + category;
        long now = Instant.now().toEpochMilli();
        long windowStart = now - 600000; // 10 minutes

        // 1. Clean up old events (Sliding Window in Redis ZSET)
        redisTemplate.opsForZSet().removeRangeByScore(key, 0, windowStart);

        // 2. Count current events
        Long count = redisTemplate.opsForZSet().count(key, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY);

        // 3. Level 1: > 5 alerts in 10 mins
        if (count != null && count >= 5) {
            return true;
        }

        // 4. Record current event
        redisTemplate.opsForZSet().add(key, String.valueOf(now), now);
        redisTemplate.expire(key, 1, TimeUnit.HOURS);
        return false;
    }
}
