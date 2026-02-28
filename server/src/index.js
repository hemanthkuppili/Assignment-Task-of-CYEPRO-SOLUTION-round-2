import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { connectMongo, connectPg } from './config/database.js';
import { startAIWorker, startDeliveryWorker } from './workers/aiWorker.js';

// Routes
import eventRoutes from './routes/events.js';
import ruleRoutes from './routes/rules.js';
import dashboardRoutes from './routes/dashboard.js';
import healthRoutes from './routes/health.js';
import { seedDatabase } from './data/seed.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static dashboard assets (optional)
// app.use(express.static('../client'));

// API Routes
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/rules', ruleRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/health', healthRoutes);

// Shared state for real-time dashboard
app.set('socketio', io);

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize Services
const start = async () => {
    try {
        if (config.dbType === 'mongodb') await connectMongo();
        else await connectPg();

        await seedDatabase();

        // Start Background Workers
        startAIWorker();
        startDeliveryWorker();

        const PORT = config.port;
        httpServer.listen(PORT, () => {
            console.log(`Notification Priorities Engine running on port ${PORT}`);
            console.log(`Environment: ${config.nodeEnv}`);
        });

        // Socket logic for dashboard
        io.on('connection', (socket) => {
            console.log('Dashboard Client connected');
        });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

start();
