import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectDB } from './db/connect.mjs';
import authRoutes from './routes/authRoutes.mjs';
import logger from './utils/logger.mjs';
import rateLimit from 'express-rate-limit';
import ensureIndexes  from './db/ensureIndexes.mjs'; // Import the ensureIndexes function
import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const app = express();
// Set rate limit (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.',
});


// Apply rate limiting to all routes
app.use(limiter);

// Middleware
app.use(express.json()); // ✅ Handles JSON requests
app.use(express.urlencoded({ extended: true })); // ✅ Handles URL-encoded requests
app.use(cors({
  origin: "*", // allow all origins for testing
  methods: ["GET","POST","PUT","DELETE"],
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // ✅ Parses form-urlencoded bodie

// Connect to database
connectDB().then(async(client) => {
  const db = client.db('deliverme'); // Access the database from the client
  app.locals.db = db; // Store the db in app.locals
  logger.info('Database connected and ready to use');
  console.log('Database connected and ready to use');
  // ✅ Ensure indexes here
  await ensureIndexes(db, logger)
}).catch(error => {
  logger.error('Error while connecting to database: %s', error.message);
});
// Routes
app.use('/api/auth', authRoutes);
// Redis test route
// This route connects to Redis, stores 100 items, and returns a success message.
app.get('/api/redis-store', async (req, res) => {
  try {
    const redis = new Redis(process.env.REDIS_HOST);

    // Store 100 items
    const setPromises = [];
    for (let i = 1; i <= 100; i++) {
      setPromises.push(redis.set(`test-key-${i}`, `Hello, Redis ${i}`));
    }
    await Promise.all(setPromises);

    res.json({ message: 'Stored 100 items in Redis!' });

    redis.disconnect();
  } catch (error) {
    logger.error('Redis store error: %s', error.message);
    res.status(500).json({ message: 'Redis store error', error: error.message });
  }
});
// This route connects to Redis, retrieves the 100 stored items, and returns them in the response.
app.get('/api/redis-get', async (req, res) => {
  try {
    const redis = new Redis(process.env.REDIS_HOST);

    // Retrieve all 100 items
    const getPromises = [];
    for (let i = 1; i <= 100; i++) {
      getPromises.push(redis.get(`test-key-${i}`));
    }
    const values = await Promise.all(getPromises);

    // Format response
    const result = values.map((value, i) => ({
      key: `test-key-${i + 1}`,
      value,
    }));

    res.json({ message: 'Fetched 100 items from Redis!', data: result });

    redis.disconnect();
  } catch (error) {
    logger.error('Redis get error: %s', error.message);
    res.status(500).json({ message: 'Redis get error', error: error.message });
  }
});



// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error: %s', err.message);
  res.status(500).json({ message: 'Internal server error' });
});


export default app;
