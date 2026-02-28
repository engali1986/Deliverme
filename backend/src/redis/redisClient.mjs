// src/redis/redisClient.mjs
import Redis from "ioredis";
import logger from "../utils/logger.mjs";

let redisClient;

/**
 * Initialize Redis client (singleton)
 */
function initRedis() {
  if (redisClient) return redisClient;

  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: true,
    reconnectOnError: (err) => {
      logger.error("Redis reconnect error:", err.message);
      return true;
    },
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error("Redis reconnect failed after 10 attempts");
        return null; // stop retrying
      }
      return Math.min(times * 100, 3000);
    },
  });

  redisClient.on("connect", () => {
    logger.info("Redis connecting...");
  });

  redisClient.on("ready", () => {
    logger.info("Redis connected and ready");
  });

  redisClient.on("error", (err) => {
    logger.error("Redis error:", err.message);
  });

  redisClient.on("end", () => {
    logger.warn("Redis connection closed");
  });

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
  try {
    const redis = initRedis();

    const pipeline = redis.pipeline();

    pipeline.geoadd("drivers:geo", longitude, latitude, driverId);
    pipeline.set(`driver:${driverId}:alive`, 1, "EX", 120);

    const results = await pipeline.exec();

    const hasError = results.some(([err]) => err);

    if (hasError) {
      logger.warn(`Redis pipeline error for driver ${driverId}`, results);
      ack?.({ ok: false, reason: "REDIS_ERROR" });
      return;
    }

    logger.info(
      `Updated location for driver ${driverId}: (${latitude}, ${longitude})`
    );

    ack?.({ ok: true, reason: "SUCCESS" });

  } catch (error) {
    logger.error("addDriverToGeo error:", error.message);
    ack?.({ ok: false, reason: "SERVER_ERROR" });
  }
}

export async function removeDriverFromGeo(driverId) {
  const redis = initRedis();
  await redis.zrem("drivers:geo", driverId.toString());
}

export async function findNearbyDrivers(
  longitude,
  latitude,
  radiusKm = 5,
  limit = 20
) {
  try {
    const redis = initRedis();

    const drivers = await redis.georadius(
      "drivers:geo",
      longitude,
      latitude,
      radiusKm,
      "km",
      "WITHDIST",
      "COUNT",
      limit,
      "ASC"
    );

    if (!drivers.length) return [];

    // Pipeline alive check
    const pipeline = redis.pipeline();

    drivers.forEach(([driverId]) => {
      pipeline.exists(`driver:${driverId}:alive`);
    });

    const aliveResults = await pipeline.exec();

    const aliveDrivers = [];
    const staleDrivers = [];

    drivers.forEach(([driverId, distance], index) => {
      const [err, exists] = aliveResults[index];

      if (err) {
        logger.warn("Alive check error:", err.message);
        staleDrivers.push(driverId);
        return;
      }

      if (exists === 1) {
        aliveDrivers.push([driverId, distance]);
      } else {
        staleDrivers.push(driverId);
      }
    });

    // Cleanup stale drivers
    if (staleDrivers.length) {
      const cleanup = redis.pipeline();
      staleDrivers.forEach(id => cleanup.zrem("drivers:geo", id));
      await cleanup.exec();
    }

    return aliveDrivers;

  } catch (error) {
    logger.error("Error finding nearby drivers:", error.message);
    return [];
  }
}

// Reemove ride from redis geo
export async function removeRideFromGeo(rideId) {
  const redis = getRedis()
  await redis.zrem("rides:geo", rideId.toString());
}



/**
 * Graceful shutdown
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info("Redis connection closed gracefully");
  }
}