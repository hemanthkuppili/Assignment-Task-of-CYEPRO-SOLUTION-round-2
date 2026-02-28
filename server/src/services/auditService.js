import { getDb } from '../config/database.js';
import { config } from '../config/index.js';

/**
 * Audit records are ALWAYS append-only.
 * We store them in a way that maps to both MongoDB (array/documents) and SQL (rows).
 */
export const auditLog = async (eventId, step, classification, metadata = {}) => {
    const db = await getDb();
    const logBatch = {
        event_id: eventId,
        step,
        classification,
        metadata,
        timestamp: new Date()
    };

    if (config.dbType === 'mongodb') {
        const auditCollection = db.collection('audit_logs');
        await auditCollection.insertOne(logBatch);

        // Also update the event document for quick dashboard reads
        const eventsCollection = db.collection('events');
        await eventsCollection.updateOne(
            { _id: eventId },
            {
                $push: { audit_trail: logBatch },
                $set: { last_updated: new Date() }
            }
        );
    } else {
        await db('audit_logs').insert(logBatch);
        await db('events').where('id', eventId).update({ last_status: classification });
    }
};

export const getAuditTrail = async (eventId) => {
    const db = await getDb();
    if (config.dbType === 'mongodb') {
        return await db.collection('audit_logs').find({ event_id: eventId }).toArray();
    } else {
        return await db('audit_logs').where('event_id', eventId).orderBy('timestamp', 'asc');
    }
};
