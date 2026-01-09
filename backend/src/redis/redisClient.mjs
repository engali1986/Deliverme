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

// ================================
// GEO helpers for drivers
// ================================

export async function addDriverToGeo(driverId, longitude, latitude, ack) {
  const redis = await initRedis();

  const multi = redis.multi()
        .geoAdd("drivers:geo", { longitude, latitude, member: driverId })
        .set(`driver:${driverId}:alive`, 1, { EX: 15 }); // 15 sec TTL

      // avoid hanging indefinitely by racing with a timeout
      const execPromise = multi.exec();
      const res = await Promise.race([
        execPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error("Redis exec timeout")), 2000))
      ]);

      logger.info({ redisMultiRes: res });
      if (Array.isArray(res) && res.some(r => r instanceof Error)) {
        logger.warn(`Redis multi returned command error for driver ${driverId}`, { res });
        ack?.({ ok: false, reason: "REDIS_ERROR" });
        return
      }
      logger.info(`Updated location for driver ${driverId}: (${latitude}, ${longitude})`);
    // Send ACK
      ack?.({ ok: true, reason: "SUCCESS" });
}

export async function removeDriverFromGeo(driverId) {
  const redis = await initRedis();
  await redis.zRem('drivers:geo', driverId.toString());
}

export async function findNearbyDrivers(longitude, latitude, radiusKm = 5, limit = 20) {
  const redis = await initRedis();

  return redis.geoSearch(
    'drivers:geo',
    {
      longitude,
      latitude,
    },
    {
      radius: radiusKm,
      unit: 'km',
      WITHDIST: true,
      COUNT: limit,
      SORT: 'ASC',
    }
  );
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
