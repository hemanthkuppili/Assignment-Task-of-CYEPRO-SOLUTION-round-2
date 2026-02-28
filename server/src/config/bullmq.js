// MOCK QUEUE for BullMQ when Redis is unavailable
class MockQueue {
    constructor(name) {
        this.name = name;
        this.jobs = [];
        console.log(`BullMQ-Mock: Queue '${name}' initialized`);
    }
    async add(type, data, opts) {
        console.log(`BullMQ-Mock: [${this.name}] Added job: ${type}`, data);
        this.jobs.push({ id: Math.random().toString(36).substring(7), type, data });
        return { id: this.jobs[this.jobs.length - 1].id };
    }
    async getJob(id) { return this.jobs.find(j => j.id === id) || null; }
    on(event, cb) { }
}

import { Queue, QueueEvents } from 'bullmq';
import { redis, isRedisMock } from './redis.js';

let aiClassificationQueue;
let deliveryQueue;
let dlqQueue;

if (isRedisMock()) {
    aiClassificationQueue = new MockQueue('AI_CLASSIFICATION');
    deliveryQueue = new MockQueue('DELIVERY');
    dlqQueue = new MockQueue('DLQ');
} else {
    try {
        aiClassificationQueue = new Queue('AI_CLASSIFICATION', { connection: redis });
        deliveryQueue = new Queue('DELIVERY', { connection: redis });
        dlqQueue = new Queue('DLQ', { connection: redis });
    } catch (e) {
        console.warn('BullMQ: Connection failed, using Mock Tier');
        aiClassificationQueue = new MockQueue('AI_CLASSIFICATION');
        deliveryQueue = new MockQueue('DELIVERY');
        dlqQueue = new MockQueue('DLQ');
    }
}

export { aiClassificationQueue, deliveryQueue, dlqQueue };
export const queueEvents = { on: (e, cb) => { } }; // Mock events
