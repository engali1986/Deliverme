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
    const redis = await getRedis();

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
  const redis = await getRedis();
  await redis.zrem("drivers:geo", driverId.toString());
}

export async function addDriverData(driverId, data) {
  try {
    const redis = await getRedis();
     const pipeline = redis.pipeline();

  pipeline.hset(`driver:${driverId}`, {
    name: data.name,
    vehicle: JSON.stringify(data.vehicle),
  });

  // TTL (optional but recommended)
  pipeline.expire(`driver:${driverId}`, 24*3600); // 24 hours 

  await pipeline.exec();
  return { ok: true, reason: "Driver data added" };

  } catch (error) {
    logger.error("addDriverData error:", error.message);
    return { ok: false, reason: error.message || "SERVER_ERROR" };
  }
}

export async function getDriverData(driverId) {
  try {
    const redis = await getRedis();
    const key = `driver:${driverId}`;
    const data = JSON.parse(await redis.hgetall(key) );

    if (!data || Object.keys(data).length === 0) {
      logger.warn(`No data found for driver ${driverId}`);
      return null;
    }

    return {
      name: data.name || "",
      vehicle: data.vehicle || "",
    };

  } catch (error) {
    logger.error("getDriverData error:", error.message);
    return null;
  }
}

/**
 * ❌ Remove driver from cache (offline)
 */

export async function removeDriverData(driverId) {
  try {
    const redis = await getRedis();
    

  await redis.del(`driver:${driverId}`);
  await redis.zrem("drivers:geo", driverId.toString()); // remove from GEO if used
  return { ok: true, reason: "Driver data removed" };
  } catch (error) {
    logger.error("removeDriverData error:", error.message);
    return { ok: false, reason: error.message || "SERVER_ERROR" };
  }
}   

// ================================
// GEO helpers for rides
// ================================


export async function findNearbyDrivers(
  longitude,
  latitude,
  radiusKm = 5,
  limit = 20
) {
  try {
    const redis = await getRedis();
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
    console.log(`Found ${aliveDrivers.length} alive drivers, removed ${staleDrivers.length} stale drivers`);

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
  ClientId,
  pickup,
  destination,
  pickupAddress,
  destinationAddress,
  fare,
  status = "pending",
  expiresAt
) {
  try {
    // ================================
    // STEP 1: Get Redis instance
    // ================================
    const redis = await getRedis();

    console.log(
      `Adding ride ${rideId} to geo with pickup (${pickup.latitude}, ${pickup.longitude}) and destination (${destination.latitude}, ${destination.longitude})`
    );

    // ================================
    // STEP 2: Validate required inputs
    // ================================
    if (!rideId || !pickup || !destination) {
      throw new Error("Missing rideId or coordinates");
    }

    // ================================
    // STEP 3: Calculate TTL (expiration time)
    // Convert expiresAt → milliseconds → seconds
    // Redis EXPIRE works in seconds
    // ================================
    const ttlMs = new Date(expiresAt).getTime() - Date.now();
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

    // Redis key for ride data
    const key = `ride:${rideId}`;

    // ================================
    // STEP 4: Create pipeline (batch commands)
    // This improves performance (1 round-trip instead of many)
    // ================================
    const pipeline = redis.pipeline();

    // ================================
    // STEP 5: Add ride location to GEO index
    // This allows searching nearby rides later
    // Key: "rides:geo"
    // Member: rideId
    // Value: (longitude, latitude)
    // ================================
    pipeline.geoadd(
      "rides:geo",
      pickup.longitude,
      pickup.latitude,
      rideId.toString()
    );

    // ================================
    // STEP 6: Store ride details as HASH
    // HSET = store structured data (like object)
    // Key: "ride:{rideId}"
    // ================================
    pipeline.hset(key, {
      rideId: rideId.toString(),
      ClientId: String(ClientId),

      // Pickup location
      pickupLat: String(pickup.latitude),
      pickupLon: String(pickup.longitude),

      // Destination location
      destinationLat: String(destination.latitude),
      destinationLon: String(destination.longitude),

      // Ride info
      fare: String(fare),
      status: String(status),

      // Expiration timestamp
      expiresAt: new Date(expiresAt).toISOString(),
    });

    // ================================
    // STEP 7: Set expiration (TTL)
    // Ride will be automatically deleted after TTL
    // ================================
    pipeline.expire(key, ttlSeconds);

    // ================================
    // STEP 8: Execute all Redis commands
    // ================================
    const results = await pipeline.exec();

    // ================================
    // STEP 9: Check for errors in pipeline
    // ================================
    const hasError = results.some(([err]) => err);

    if (hasError) {
      logger.warn(`Redis pipeline error for ride ${rideId}`, results);
      return { ok: false, reason: "REDIS_ERROR" };
    }

    // ================================
    // STEP 10: Success response
    // ================================
    return { ok: true, reason: "SUCCESS" };

  } catch (error) {
    // ================================
    // STEP 11: Handle unexpected errors
    // ================================
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
    // ================================
    // STEP 1: Get Redis instance
    // ================================
    const redis = await getRedis();
    console.log(`Finding nearby rides for location (${latitude}, ${longitude}) within ${radiusKm} km`);

    // ================================
    // STEP 2: Search for nearby rides using GEO
    // This returns rideIds within radius
    // ================================
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
    console.log(`GEO search found ${rideIds.length} ride(s) nearby`);
    console.log('Nearby ride IDs:', rideIds);

    // ================================
    // STEP 3: If no rides found → return empty array
    // ================================
    if (!rideIds.length) return [];

    // ================================
    // STEP 4: Check which rides still exist (not expired)
    // Because HASH keys may expire but GEO may still contain old IDs
    // ================================
    const existsPipeline = redis.pipeline();

    rideIds.forEach((rideId) => {
      existsPipeline.exists(`ride:${rideId}`);
    });

    const existsResults = await existsPipeline.exec();

    // ================================
    // STEP 5: Separate valid rides from stale rides
    // ================================
    console.log('Exsists results for nearby rides:', existsResults);
    const liveIds = [];
    const staleIds = [];

    rideIds.forEach((rideId, index) => {
      const [err, exists] = existsResults[index];
      console.log('exists result ', err, exists)

      // If error OR ride hash does not exist → stale
      if (err || exists !== 1) {
        staleIds.push(rideId);
      } else {
        liveIds.push(rideId);
      }
    });
    console.log(`Live rides: ${liveIds.length}, Stale rides: ${staleIds.length}`);
    console.log('Live ride IDs:', liveIds);
    console.log('Stale ride IDs:', staleIds);

    // ================================
    // STEP 6: Cleanup stale rides from GEO
    // Remove rides that no longer exist in Redis
    // ================================
    if (staleIds.length) {
      const cleanup = redis.pipeline();

      staleIds.forEach((id) => cleanup.zrem("rides:geo", id));

      await cleanup.exec();
    }

    // ================================
    // STEP 7: If no valid rides remain → return empty
    // ================================
    console.log(`After cleanup, ${liveIds.length} live ride(s) remain`);
    if (!liveIds.length) return [];

    // ================================
    // STEP 8: Fetch ride details from HASH
    // Using pipeline for performance
    // ================================
    const dataPipeline = redis.pipeline();

    liveIds.forEach((rideId) => {
      dataPipeline.hgetall(`ride:${rideId}`);
    });

    const dataResults = await dataPipeline.exec();

    // ================================
    // STEP 9: Build final rides array
    // Convert Redis strings → proper JS types
    // ================================
    const rides = [];

    liveIds.forEach((rideId, index) => {
      const [err, hash] = dataResults[index];

      // Skip if error or empty data
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

    // ================================
    // STEP 10: Return final rides list
    // ================================
    console.log(`Returning ${rides.length} nearby ride(s) with details`);
    return rides;

  } catch (error) {
    // ================================
    // STEP 11: Handle unexpected errors
    // ================================
    logger.error("Error finding nearby rides:", error.message);
    return [];
  }
}

// Remove ride from redis geo
export async function removeRideFromGeo(rideId) {
  const redis = await getRedis();
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
