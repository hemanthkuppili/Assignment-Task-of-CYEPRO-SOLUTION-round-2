import express from 'express';
import { getDb } from '../config/database.js';
import { config } from '../config/index.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

export default router
    .use(authMiddleware)
    .get('/', async (req, res) => {
        const db = await getDb();
        const rules = config.dbType === 'mongodb'
            ? await db.collection('rules').find({}).toArray()
            : await db('rules').select('*');
        res.json(rules);
    })
    .post('/', adminMiddleware, async (req, res) => {
        const { category, pattern, target_priority } = req.body;
        const db = await getDb();

        if (!category || !pattern || !target_priority) {
            return res.status(400).json({ error: 'Missing fields: category, pattern, target_priority' });
        }

        const ruleDoc = {
            category,
            pattern,
            target_priority,
            is_active: true,
            updated_at: new Date()
        };

        if (config.dbType === 'mongodb') {
            await db.collection('rules').insertOne(ruleDoc);
        } else {
            await db('rules').insert(ruleDoc);
        }

        res.status(201).json({ message: 'Rule added.', rule: ruleDoc });
    })
    .delete('/:id', adminMiddleware, async (req, res) => {
        // Implement delete logic based on ID
        res.json({ message: 'Rule deleted.' });
    });
