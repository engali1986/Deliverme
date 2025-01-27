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
connectDB().then((client) => {
  const db = client.db('deliverme'); // Access the database from the client
  app.locals.db = db; // Store the db in app.locals
  logger.info('Database connected and ready to use');
  console.log('Database connected and ready to use');
}).catch(error => {
  logger.error('Error while connecting to database: %s', error.message);
});
// Routes
app.use('/api/auth', authRoutes);
// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error: %s', err.message);
  res.status(500).json({ message: 'Internal server error' });
});


export default app;
