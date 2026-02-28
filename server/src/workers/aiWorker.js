import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { classifyEventAI } from '../services/aiService.js';
import { auditLog } from '../services/auditService.js';
import { updateEventStatus, finalRouting } from '../services/orchestratorService.js';

/**
 * Worker to process the AI Classification Queue (Asynchronous).
 */
export const startAIWorker = () => {
    const worker = new Worker('AI_CLASSIFICATION', async (job) => {
        const { eventId, content, category, user_id } = job.data;

        try {
            const result = await classifyEventAI(content, category);

            await auditLog(eventId, 'AI_CLASSIFICATION', result.classification, {
                confidence: result.confidence,
                model: result.model,
                fallback: !!result.fallback
            });

            await finalRouting(eventId, result.classification, { user_id, category, content });

        } catch (error) {
            console.error('AI Worker error for event:', eventId, error);
            await auditLog(eventId, 'AI_ERROR', 'FAILED', { error: error.message });
            // Let it retry based on BullMQ configuration
            throw error;
        }
    }, { connection: redis });

    worker.on('completed', job => console.log(`AI Job ${job.id} completed`));
    worker.on('failed', (job, err) => console.error(`AI Job ${job.id} failed`, err));
};

/**
 * Worker to process the Delivery Queue (Instant Now or Delayed Later).
 */
export const startDeliveryWorker = () => {
    const worker = new Worker('DELIVERY', async (job) => {
        const { eventId, payload } = job.data;
        // Mock notification delivery (Email/SMS/Push)
        console.log(`[DELIVERY] Delivering event ${eventId} to user ${payload.user_id}`);
        await auditLog(eventId, 'DELIVERY_DISPATCH', 'DELIVERED', { provider: 'MOCK_AWS_SES' });
    }, { connection: redis });

    worker.on('completed', job => console.log(`Delivery Job ${job.id} completed`));
};
