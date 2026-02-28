package com.priorityengine.service;

import com.priorityengine.model.NotificationEvent;
import com.priorityengine.utils.SimHash;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class OrchestratorService {

    private final MongoTemplate mongoTemplate;
    private final StringRedisTemplate redisTemplate;
    private final FatigueService fatigueService;

    public NotificationEvent processNotification(NotificationEvent event) {
        event.setId(UUID.randomUUID().toString());
        event.setTimestamp(LocalDateTime.now());
        event.setStatus("PENDING");

        // 1. Exact Deduplication (Redis Hash)
        String contentHash = Integer.toHexString(event.getContent().hashCode());
        String exactDedupeKey = "dedupe:" + event.getUserId() + ":" + contentHash;
        if (redisTemplate.hasKey(exactDedupeKey)) {
            setStatus(event, "NEVER", "Exact Duplicate in 5m");
            return persist(event);
        }
        redisTemplate.opsForValue().set(exactDedupeKey, "1", 5, TimeUnit.MINUTES);

        // 2. Near-Duplicate (SimHash)
        BigInteger fingerprint = SimHash.generateFingerprint(event.getContent());
        String nearDedupeKey = "simhash:" + event.getUserId();
        Set<String> recentSimhashes = redisTemplate.opsForSet().members(nearDedupeKey);
        if (recentSimhashes != null) {
            for (String sh : recentSimhashes) {
                if (SimHash.hammingDistance(fingerprint, new BigInteger(sh)) <= 3) {
                    setStatus(event, "NEVER", "Near-duplicate recently detected");
                    return persist(event);
                }
            }
        }
        redisTemplate.opsForSet().add(nearDedupeKey, fingerprint.toString());
        redisTemplate.expire(nearDedupeKey, 30, TimeUnit.MINUTES);

        // 3. Fatigue Check
        if (fatigueService.isUserFatigued(event.getUserId(), event.getCategory())) {
            setStatus(event, "LATER", "User alert fatigue triggered - bucket level exceeded");
            return persist(event);
        }

        // 4. Default to PENDING_AI (In a real system, we'd trigger Spring AMQP / RabbitMQ here)
        setStatus(event, "PENDING_AI", "Routing to AI Classification Tier");
        return persist(event);
    }

    private void setStatus(NotificationEvent event, String status, String reason) {
        event.setStatus(status);
        NotificationEvent.AuditTrail trail = new NotificationEvent.AuditTrail();
        trail.setStep("DECISION_LOGIC");
        trail.setDecision(status);
        trail.setMetadata(reason);
        trail.setTimestamp(LocalDateTime.now());
        event.getAuditTrail().add(trail);
    }

    private NotificationEvent persist(NotificationEvent event) {
        return mongoTemplate.save(event);
    }
}
