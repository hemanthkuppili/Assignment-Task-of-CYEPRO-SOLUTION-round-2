import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/priority_engine',
  pgUri: process.env.PG_URI || 'postgres://postgres:postgres@localhost:5432/priority_engine',
  redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
  openaiApiKey: process.env.OPENAI_API_KEY,
  dbType: process.env.DB_TYPE || 'mongodb', // 'mongodb' or 'postgres'
  circuitBreakerThreshold: 0.5,
  circuitBreakerWindowMs: 60000,
  retryMax: 3
};
