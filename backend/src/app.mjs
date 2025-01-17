import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectDB } from './db/connect.mjs';
import authRoutes from './routes/authRoutes.mjs';
import logger from './utils/logger.mjs';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to database
connectDB().then((db) => {
  app.locals.db = db;
  logger.info('Database connected and ready to use');
  console.log('Database connected and ready to use');
});

// Routes
app.use('/api/auth', authRoutes);
// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error: %s', err.message);
  res.status(500).json({ message: 'Internal server error' });
});


export default app;
