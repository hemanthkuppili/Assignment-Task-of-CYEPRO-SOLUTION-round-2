import { MongoClient } from 'mongodb';
import knex from 'knex';
import { config } from './index.js';

let mongoClient = null;
let pgClient = null;

export const connectMongo = async () => {
    try {
        mongoClient = new MongoClient(config.mongodbUri);
        await mongoClient.connect();
        console.log('MongoDB: Connected');
        return mongoClient.db();
    } catch (error) {
        console.error('MongoDB: Connection failed', error);
        return null;
    }
};

export const connectPg = async () => {
    try {
        pgClient = knex({
            client: 'pg',
            connection: config.pgUri,
            pool: { min: 2, max: 10 }
        });
        await pgClient.raw('SELECT 1');
        console.log('PostgreSQL: Connected');
        return pgClient;
    } catch (error) {
        console.error('PostgreSQL: Connection failed', error);
        return null;
    }
};

export const getDb = async () => {
    if (config.dbType === 'mongodb') {
        if (!mongoClient) return await connectMongo();
        return mongoClient.db();
    } else {
        if (!pgClient) return await connectPg();
        return pgClient;
    }
};
