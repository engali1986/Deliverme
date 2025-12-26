// src/redis/redisClient.mjs
import { createClient } from 'redis';
import logger from '../utils/logger.mjs';

let redisClient;

/**
 * Initialize Redis client (singleton)
 */
async function initRedis() {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: process.env.REDIS_URL, // e.g. redis://localhost:6379
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnect failed after 10 attempts');
          return new Error('Redis unavailable');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis connecting...');
  });

  redisClient.on('ready', () => {
    logger.info('Redis connected and ready');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error: %s', err.message);
  });

  redisClient.on('end', () => {
    logger.warn('Redis connection closed');
  });

  await redisClient.connect();

  return redisClient;
}

/**
 * Get Redis client (always initialized)
 */
export async function getRedis() {
  if (!redisClient) {
    await initRedis();
  }
  return redisClient;
}

/**
 * Graceful shutdown
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed gracefully');
  }
}
