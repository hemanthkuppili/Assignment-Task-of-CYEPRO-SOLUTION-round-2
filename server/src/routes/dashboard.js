import express from 'express';
import { getDb } from '../config/database.js';
import { auditLog } from '../services/auditService.js';
import { aiCircuitBreaker } from '../utils/circuitBreaker.js';

const router = express.Router();

export default router.get('/metrics', async (req, res) => {
    try {
        const db = await getDb();
        const events = await db.collection('events').find({}).limit(100).sort({ timestamp: -1 }).toArray();
        const auditLogs = await db.collection('audit_logs').countDocuments({});

        // Aggregate classification stats
        const stats = await db.collection('events').aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]).toArray();

        // Circuit status
        const aiStatus = aiCircuitBreaker.getStatus();

        res.json({
            summary: {
                totalEvents: events.length,
                totalAuditLogs: auditLogs,
                aiStatus,
                classifications: stats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
            },
            recentEvents: events.map(e => ({
                id: e._id,
                user: e.user_id,
                status: e.status,
                content: e.content.substring(0, 30) + '...',
                ts: e.timestamp
            }))
        });
    } catch (err) {
        console.error('Dashboard Error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
});
