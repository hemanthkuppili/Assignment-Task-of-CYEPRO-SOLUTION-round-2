import { v4 as uuidv4 } from 'uuid';
import { generateSimHash, hammingDistance } from '../utils/simhash.js';
import { redis } from '../config/redis.js';
import { auditLog } from './auditService.js';
import { aiClassificationQueue, deliveryQueue } from '../config/bullmq.js';
import { getDb } from '../config/database.js';
import { config } from '../config/index.js';

/**
 * Main event processing orchestrator.
 */
export const processIncomingEvent = async (eventPayload) => {
    const eventId = uuidv4();
    const { user_id, category, content } = eventPayload;

    const db = await getDb();

    // 0. Persist Event (Stage 1)
    const eventDoc = {
        _id: eventId,
        user_id,
        category,
        content,
        timestamp: new Date(),
        status: 'PENDING'
    };
    if (config.dbType === 'mongodb') await db.collection('events').insertOne(eventDoc);
    else await db('events').insert(eventDoc);

    await auditLog(eventId, 'INGESTION', 'PENDING', { source: eventPayload.source || 'CLIENT' });

    // 1. EXACT DEDUPLICATION
    const exactHash = crypto.createHash('sha256').update(content).digest('hex');
    const dedupeKey = `dedupe:${user_id}:${exactHash}`;
    const isDuplicate = await redis.get(dedupeKey);
    if (isDuplicate) {
        await auditLog(eventId, 'EXACT_DEDUPE', 'NEVER', { reason: 'Previous same message in 5min' });
        await updateEventStatus(eventId, 'NEVER');
        return { eventId, status: 'NEVER', reason: 'Exact Duplicate' };
    }
    await redis.set(dedupeKey, '1', 'EX', 300); // 5 min TTL

    // 2. NEAR-DUPLICATE DETECTION
    const simhash = generateSimHash(content);
    const recentSimhashKey = `simhash:${user_id}`;
    const recentSimhashes = await redis.smembers(recentSimhashKey);
    for (let recent of recentSimhashes) {
        if (hammingDistance(BigInt(recent), simhash) <= 3) {
            await auditLog(eventId, 'NEAR_DEDUPE', 'NEVER', { reason: 'Similar message recently detected' });
            await updateEventStatus(eventId, 'NEVER');
            return { eventId, status: 'NEVER', reason: 'Near-Duplicate' };
        }
    }
    await redis.sadd(recentSimhashKey, simhash.toString());
    await redis.expire(recentSimhashKey, 1800); // 30 min sliding window

    // 3. STATIC RULE CHECK
    const rules = await getDbRulesForCategory(category);
    for (let rule of rules) {
        if (new RegExp(rule.pattern, 'i').test(content)) {
            const decision = rule.target_priority; // NOW, LATER, NEVER
            await auditLog(eventId, 'STATIC_RULE', decision, { rule_id: rule.id });
            await finalRouting(eventId, decision, eventPayload);
            return { eventId, status: decision, via: 'RULE' };
        }
    }

    // 4. AI CLASSIFICATION (ASYNC)
    // We add to AI classification queue and return "PENDING_AI" to the initial caller
    await aiClassificationQueue.add('classify', { eventId, user_id, category, content }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
    });

    await auditLog(eventId, 'AI_QUEUE', 'PENDING', { queue: 'AI_CLASSIFICATION' });
    return { eventId, status: 'PENDING', via: 'AI' };
};

export const updateEventStatus = async (eventId, status) => {
    const db = await getDb();
    if (config.dbType === 'mongodb') await db.collection('events').updateOne({ _id: eventId }, { $set: { status } });
    else await db('events').where('id', eventId).update({ status });
};

async function getDbRulesForCategory(cat) {
    const db = await getDb();
    if (config.dbType === 'mongodb') return await db.collection('rules').find({ category: cat, is_active: true }).toArray();
    else return await db('rules').where({ category: cat, is_active: true });
}

export const finalRouting = async (eventId, decision, payload) => {
    if (decision === 'NOW') {
        await deliveryQueue.add('deliver', { eventId, payload });
    } else if (decision === 'LATER') {
        // Schedule for later (e.g., 4 hours)
        await deliveryQueue.add('deliver', { eventId, payload }, { delay: 4 * 60 * 60 * 1000 });
    }
    await updateEventStatus(eventId, decision);
};
