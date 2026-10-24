import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initDb } from './config/db.js';
import { scheduler } from './services/scheduler.js';

import authRoutes from './routes/auth.js';
import donationRoutes from './routes/donations.js';
import requestRoutes from './routes/requests.js';
import matchRoutes from './routes/matches.js';
import reservationRoutes from './routes/reservations.js';
import notificationRoutes from './routes/notifications.js';
import impactRoutes from './routes/impact.js';
import reportRoutes from './routes/reports.js';
import aiRoutes from './routes/ai.js';
import rescueFlowRoutes from './routes/rescueFlow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite Schema
initDb();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded donation images statically
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'FoodBridge AI',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/impact', impactRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/rescueflow', rescueFlowRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred.'
  });
});

// Start scheduler background job
scheduler.start();

// Start Server
const server = app.listen(PORT, () => {
  console.log(`FoodBridge AI Backend running on http://localhost:${PORT}`);
});

export default app;
