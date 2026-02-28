import { getDb } from '../config/database.js';
import { config } from '../config/index.js';

const seedRules = [
    { category: 'SECURITY', pattern: 'unauthorized|login|password', target_priority: 'NOW' },
    { category: 'TRANSACTIONAL', pattern: 'receipt|invoice|confirmed', target_priority: 'LATER' },
    { category: 'MARKETING', pattern: 'sale|promo|off', target_priority: 'NEVER' },
    { category: 'SOCIAL', pattern: 'followed|liked|poked', target_priority: 'LATER' }
];

export const seedDatabase = async () => {
    const db = await getDb();
    if (config.dbType === 'mongodb') {
        const rulesCollection = db.collection('rules');
        const count = await rulesCollection.countDocuments();
        if (count === 0) {
            await rulesCollection.insertMany(seedRules.map(r => ({ ...r, is_active: true, created_at: new Date() })));
            console.log('Seed: Static Rules populated (MongoDB)');
        }
    } else {
        const count = await db('rules').count('id as count').first();
        if (count.count === 0) {
            await db('rules').insert(seedRules);
            console.log('Seed: Static Rules populated (PostgreSQL)');
        }
    }
};
