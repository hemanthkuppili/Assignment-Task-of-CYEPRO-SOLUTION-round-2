// IN-MEMORY MOCK MongoDB
class MemoryDB {
    constructor() {
        this.collections = {};
        console.log('MongoDB: Logic running in [Memory-Simulation] mode');
    }
    collection(name) {
        if (!this.collections[name]) this.collections[name] = new Map();
        const coll = this.collections[name];
        return {
            insertOne: async (doc) => {
                const id = doc.id || doc._id || Math.random().toString(36).substring(7);
                const finalDoc = { ...doc, id, _id: id };
                coll.set(id, finalDoc);
                return { acknowledged: true, insertedId: id };
            },
            insertMany: async (docs) => {
                docs.forEach(doc => {
                    const id = doc.id || doc._id || Math.random().toString(36).substring(7);
                    coll.set(id, { ...doc, id, _id: id });
                });
                return { acknowledged: true };
            },
            find: (query) => {
                let resArr = Array.from(coll.values());
                if (query.event_id) resArr = resArr.filter(r => r.event_id === query.event_id);
                return {
                    toArray: async () => resArr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
                    limit: (n) => ({ sort: (s) => ({ toArray: async () => resArr.slice(0, n) }) })
                };
            },
            countDocuments: async (query) => coll.size,
            updateOne: async (query, update) => {
                const docId = query._id || query.id;
                if (docId && coll.has(docId)) {
                    let d = coll.get(docId);
                    if (update['$push']) {
                        if (!d.audit_trail) d.audit_trail = [];
                        d.audit_trail.push(update['$push'].audit_trail);
                    }
                    if (update['$set']) {
                        d = { ...d, ...update['$set'] };
                    }
                    coll.set(docId, d);
                    return { modifiedCount: 1 };
                }
                return { modifiedCount: 0 };
            },
            deleteOne: async (query) => {
                const docId = query._id || query.id;
                if (docId && coll.has(docId)) {
                    coll.delete(docId);
                    return { deletedCount: 1 };
                }
                return { deletedCount: 0 };
            },
            aggregate: (pipeline) => ({
                toArray: async () => [
                    { _id: "NOW", count: Math.floor(Math.random() * 5) },
                    { _id: "LATER", count: Math.floor(Math.random() * 3) },
                    { _id: "NEVER", count: Math.floor(Math.random() * 1) }
                ]
            })
        };
    }
}

import { config } from './index.js';

let memoryDb = new MemoryDB();

export const connectMongo = async () => memoryDb;
export const connectPg = async () => null;

export const getDb = async () => {
    return memoryDb;
};
