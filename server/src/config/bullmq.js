import { Queue, QueueEvents } from 'bullmq';
import { redis } from './redis.js';

// MAIN QUEUE: AI Classification Worker
export const aiClassificationQueue = new Queue('AI_CLASSIFICATION', { connection: redis });

// DELIVERY QUEUE: Instant delivery (NOW)
export const deliveryQueue = new Queue('DELIVERY', { connection: redis });

// DEAD-LETTER QUEUE: Failed jobs from all queues
export const dlqQueue = new Queue('DLQ', { connection: redis });

export const queueEvents = new QueueEvents('AI_CLASSIFICATION', { connection: redis });
