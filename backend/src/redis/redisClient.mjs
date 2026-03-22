// src/redis/redisClient.mjs
import Redis from "ioredis";
import logger from "../utils/logger.mjs";

let redisClient;

/*
redisClient.mjs
===============
Purpose:
- Centralized Redis client initialization (singleton).
- Geo indexing for drivers and rides.
- Helpers for proximity search and stale cleanup.

Data model:
- Drivers geo: "drivers:geo" (GEOSET with driverId members)
- Driver liveness: "driver:{driverId}:alive" (string key with TTL)
- Rides geo: "rides:geo" (GEOSET with rideId members)
- Ride cache: "ride:{rideId}" (hash with pickup/destination/fare/status/expiresAt)

Key functions:
- getRedis/initRedis: create or reuse Redis connection.
- addDriverToGeo/removeDriverFromGeo/findNearbyDrivers: driver location updates + proximity search.
- addRideToGeo/findNearbyRides/removeRideFromGeo: ride caching + proximity search.
- closeRedis: graceful shutdown.
*/

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
    console.log(`Finding nearby drivers for location (${latitude}, ${longitude}) within ${radiusKm} km`);

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

// ================================
// GEO helpers for rides
// ================================

export async function addRideToGeo(
  rideId,
  pickup,
  destination,
  fare,
  status = "pending",
  expiresAt
) {
  try {
    const redis = initRedis();

    if (!rideId || !pickup || !destination) {
      throw new Error("Missing rideId or coordinates");
    }

    const ttlMs = new Date(expiresAt).getTime() - Date.now();
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

    const key = `ride:${rideId}`;

    const pipeline = redis.pipeline();

    pipeline.geoadd(
      "rides:geo",
      pickup.longitude,
      pickup.latitude,
      rideId.toString()
    );

    pipeline.hset(key, {
      rideId: rideId.toString(),
      pickupLat: String(pickup.latitude),
      pickupLon: String(pickup.longitude),
      destinationLat: String(destination.latitude),
      destinationLon: String(destination.longitude),
      fare: String(fare),
      status: String(status),
      expiresAt: new Date(expiresAt).toISOString(),
    });

    pipeline.expire(key, ttlSeconds);

    const results = await pipeline.exec();
    const hasError = results.some(([err]) => err);

    if (hasError) {
      logger.warn(`Redis pipeline error for ride ${rideId}`, results);
      return { ok: false, reason: "REDIS_ERROR" };
    }

    return { ok: true, reason: "SUCCESS" };
  } catch (error) {
    logger.error("addRideToGeo error:", error.message);
    return { ok: false, reason: "SERVER_ERROR" };
  }
}

export async function findNearbyRides(
  longitude,
  latitude,
  radiusKm = 5,
  limit = 20
) {
  try {
    const redis = initRedis();
    const rideIds = await redis.georadius(
      "rides:geo",
      longitude,
      latitude,
      radiusKm,
      "km",
      "COUNT",
      limit,
      "ASC"
    );

    if (!rideIds.length) return [];

    // Check existence of ride hashes
    const existsPipeline = redis.pipeline();
    rideIds.forEach((rideId) => {
      existsPipeline.exists(`ride:${rideId}`);
    });
    const existsResults = await existsPipeline.exec();

    const liveIds = [];
    const staleIds = [];

    rideIds.forEach((rideId, index) => {
      const [err, exists] = existsResults[index];
      if (err || exists !== 1) {
        staleIds.push(rideId);
      } else {
        liveIds.push(rideId);
      }
    });

    if (staleIds.length) {
      const cleanup = redis.pipeline();
      staleIds.forEach((id) => cleanup.zrem("rides:geo", id));
      await cleanup.exec();
    }

    if (!liveIds.length) return [];

    const dataPipeline = redis.pipeline();
    liveIds.forEach((rideId) => dataPipeline.hgetall(`ride:${rideId}`));
    const dataResults = await dataPipeline.exec();

    const rides = [];
    liveIds.forEach((rideId, index) => {
      const [err, hash] = dataResults[index];
      if (err || !hash || Object.keys(hash).length === 0) return;

      rides.push({
        rideId: hash.rideId || rideId.toString(),
        pickup: {
          latitude: Number(hash.pickupLat),
          longitude: Number(hash.pickupLon),
        },
        destination: {
          latitude: Number(hash.destinationLat),
          longitude: Number(hash.destinationLon),
        },
        fare: Number(hash.fare),
        status: hash.status,
        expiresAt: hash.expiresAt,
      });
    });

    return rides;
  } catch (error) {
    logger.error("Error finding nearby rides:", error.message);
    return [];
  }
}

// Reemove ride from redis geo
export async function removeRideFromGeo(rideId) {
  const redis = initRedis();
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
