// src/app.mjs
// Take care about cors
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.mjs';
import { connectDB } from './db/connect.mjs';
import ensureIndexes from './db/ensureIndexes.mjs';
import logger from './utils/logger.mjs';

dotenv.config();

const app = express();

/* ======================================================
   Express hardening & trust proxy
====================================================== */
app.disable('x-powered-by');

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

/* ======================================================
   Rate limiting (GLOBAL)
====================================================== */
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

/* ======================================================
   Security headers
====================================================== */
app.use(
  helmet({
    contentSecurityPolicy: false, // CSP usually not needed for pure API
  })
);

/* ======================================================
   Compression (important for mobile clients)
====================================================== */
app.use(compression());

/* ======================================================
   CORS (aligned with server.mjs)
====================================================== */
const allowedOrigin = process.env.CORS_ORIGIN || '*';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps & server-to-server calls
      if (!origin) return callback(null, true);

      if (allowedOrigin === '*' || origin === allowedOrigin) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/* ======================================================
   Request logging (Morgan → Winston)
====================================================== */
app.use(
  morgan(process.env.MORGAN_FORMAT || 'combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

/* ======================================================
   Body parsing with limits (DoS protection)
====================================================== */
app.use(express.json({ limit: process.env.BODY_LIMIT || '100kb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_LIMIT || '100kb' }));

/* ======================================================
   Health & readiness endpoints
====================================================== */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/ready', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) return res.status(503).json({ ready: false });

    await db.command({ ping: 1 });
    res.status(200).json({ ready: true });
  } catch (err) {
    logger.error('Readiness check failed: %s', err.message);
    res.status(503).json({ ready: false });
  }
});

/* ======================================================
   Routes
====================================================== */
app.use('/api/auth', authRoutes);

/* ======================================================
   Database initialization (non-blocking)
====================================================== */
connectDB()
  .then(async (client) => {
    const db = client.db(process.env.DB_NAME || 'deliverme');
    app.locals.db = db;

    logger.info('Database connected');

    try {
      await ensureIndexes(db, logger);
      logger.info('MongoDB indexes ensured');
    } catch (err) {
      logger.error('Index creation failed: %s', err.message);
    }
  })
  .catch((err) => {
    logger.error('Database connection failed: %s', err.message);
  });

/* ======================================================
   Global error handler (LAST)
====================================================== */
app.use((err, req, res, next) => {
  logger.error('Unhandled error: %s', err.stack || err.message);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  res.status(status).json({ message });
});

export default app;
