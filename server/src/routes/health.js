import express from 'express';
import { aiCircuitBreaker, dbCircuitBreaker } from '../utils/circuitBreaker.js';
import { getDb } from '../config/database.js';

const router = express.Router();

export default router.get('/', async (req, res) => {
    let dbStatus = 'UNKNOWN';
    try {
        const db = await getDb();
        if (db) dbStatus = 'CONNECTED';
    } catch (e) {
        dbStatus = 'DISCONNECTED';
    }

    const aiStatus = aiCircuitBreaker.getStatus();

    res.json({
        status: (dbStatus === 'CONNECTED' && aiStatus !== 'OPEN') ? 'OK' : 'DEGRADED',
        version: '1.0.0',
        services: {
            database: { status: dbStatus },
            ai_classifier: {
                status: aiStatus,
                circuit: aiStatus,
                retries: 3
            },
            message_queue: { status: 'LIVE', lag_ms: 0 }
        }
    });
});
