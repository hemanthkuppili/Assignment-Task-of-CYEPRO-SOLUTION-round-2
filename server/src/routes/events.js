import express from 'express';
import { processIncomingEvent } from '../services/orchestratorService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

export default router.post('/', authMiddleware, async (req, res) => {
    try {
        const user_id = req.body.user_id || req.body.userId;
        const { category, content, metadata } = req.body;

        if (!user_id || !category || !content) {
            return res.status(400).json({
                error: 'Missing required fields: user_id (or userId), category, content',
                received: { user_id, category, content }
            });
        }

        const result = await processIncomingEvent({
            user_id,
            category,
            content,
            source: req.headers['x-source'] || 'WEB_CLIENT'
        });

        // Dashboard Real-time Stat update (via socket.io)
        const io = req.app.get('socketio');
        io.emit('event_ingested', {
            eventId: result.eventId,
            status: result.status,
            category,
            content: content.substring(0, 50) + '...'
        });

        res.status(202).json({
            message: 'Event accepted. Processing asynchronously.',
            data: result
        });
    } catch (err) {
        console.error('Ingestion Error:', err);
        res.status(500).json({ error: 'Internal Ingestion Error' });
    }
});
