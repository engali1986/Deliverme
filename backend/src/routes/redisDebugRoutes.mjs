import express from "express";
import { getRedis } from "../redis/redisClient.mjs";

const router = express.Router();

/**
 * =========================================================
 * ⚠️ REDIS DEBUG ROUTES (DEVELOPMENT ONLY)
 * =========================================================
 * Purpose:
 * - Inspect Redis data during development
 * - Debug driver locations and ride data
 * - Verify GEO + HASH consistency
 *
 * ⚠️ IMPORTANT:
 * - Do NOT expose these routes in production
 * - Some endpoints use KEYS (not scalable)
 */

/* =========================================================
   GET ALL DRIVERS (RAW GEO MEMBERS)
   =========================================================
   What it does:
   - Returns all driver IDs stored in "drivers:geo"

   When to use:
   - Check if drivers are being added to Redis
   - Verify driver online updates

   Output:
   - List of driverIds only (no coordinates)
========================================================= */
router.get("/drivers", async (req, res) => {
  try {
    const redis = await getRedis();
    const drivers = await redis.zrange("drivers:geo", 0, -1);

    console.log('redisDebugRoutes - drivers:', drivers);

    res.json({
      count: drivers.length,
      drivers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   GET ALL CACHED DRIVER DATA (HASH DEBUG)
   =========================================================
   What it does:
   - Fetches all "driver:*" keys from Redis
   - Returns full cached driver data (name + vehicle info)

   How it works:
   1. Uses KEYS to find all driver cache entries
   2. Uses pipeline to fetch all HASH data efficiently

   When to use:
   - Verify driver cache is being populated correctly
   - Debug missing driver info in ride requests
   - Check consistency between GEO and HASH

   ⚠️ Note:
   - Uses KEYS → NOT suitable for production
   - Only for development/debugging

   Output:
   - driverId
   - name
   - vehicleModel
   - vehicleColor
   - plateNumber
========================================================= */
router.get("/drivers/data", async (req, res) => {
  try {
    const redis = await getRedis();

    // Get all cached driver keys
    const keys = await redis.keys("driver:*");

    if (!keys.length) {
      return res.json({
        count: 0,
        drivers: [],
      });
    }

    // Use pipeline for performance
    const pipeline = redis.pipeline();

    keys.forEach((key) => {
      pipeline.hgetall(key);
    });

    const results = await pipeline.exec();

    const drivers = results.map(([err, data], index) => {
      if (err) return null;

      const key = keys[index];
      const driverId = key.split(":")[1];

      let vehicle = null;

  try {
    vehicle = data.vehicle ? JSON.parse(data.vehicle) : null;
  } catch {
    vehicle = null;
  }

  return {
    driverId,
    name: data.name,
    vehicle,
  };
}).filter(Boolean);

    res.json({
      count: drivers.length,
      drivers,
    });

  } catch (error) {
    console.error("Redis drivers/data error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================================================
   GET SINGLE DRIVER LOCATION
   =========================================================
   What it does:
   - Fetches longitude & latitude for a specific driver

   When to use:
   - Debug driver position updates
   - Verify GPS updates from mobile app

   Output:
   - driverId + coordinates
========================================================= */
router.get("/driver/:driverId", async (req, res) => {
  try {
    const redis = await getRedis();
    const { driverId } = req.params;

    const pos = await redis.geopos("drivers:geo", driverId);

    if (!pos || !pos[0]) {
      return res.status(404).json({ message: "Driver not found in Redis" });
    }

    res.json({
      driverId,
      longitude: Number(pos[0][0]),
      latitude: Number(pos[0][1]),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   FIND NEARBY DRIVERS
   =========================================================
   What it does:
   - Finds drivers within a given radius from a point

   Query params:
   - lat → latitude
   - lng → longitude
   - radius → search radius in KM (default 5)

   When to use:
   - Test proximity matching logic
   - Verify GEO search behavior

   Output:
   - List of nearby driver IDs
========================================================= */
router.get("/nearby", async (req, res) => {
  try {
    const redis = await getRedis();
    const { lat, lng, radius = 5 } = req.query;

    const drivers = await redis.georadius(
      "drivers:geo",
      Number(lng),
      Number(lat),
      Number(radius),
      "km"
    );

    res.json({
      count: drivers.length,
      drivers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   GET ALL DRIVERS WITH COORDINATES
   =========================================================
   What it does:
   - Returns all drivers with their latitude & longitude

   How it works:
   1. Get all driver IDs
   2. Fetch all coordinates in one GEO call
   3. Merge results

   When to use:
   - Visualize drivers on map
   - Debug location updates

   Output:
   - Array of drivers with coordinates
========================================================= */
router.get("/drivers/full", async (req, res) => {
  try {
    const redis = await getRedis();

    const driverIds = await redis.zrange("drivers:geo", 0, -1);

    if (!driverIds.length) {
      return res.json({
        count: 0,
        drivers: [],
      });
    }

    const pipeline = redis.pipeline();
    driverIds.forEach((driverId) => {
      pipeline.geopos("drivers:geo", driverId);
    });

    const pipelineResults = await pipeline.exec();

    const drivers = driverIds.map((driverId, index) => {
      const [err, pos] = pipelineResults[index];
      if (err || !pos || !pos[0]) return null;

      return {
        driverId,
        latitude: Number(pos[0][1]),
        longitude: Number(pos[0][0]),
      };
    }).filter(Boolean);

    res.json({
      count: drivers.length,
      drivers,
    });
  } catch (err) {
    console.error("Redis drivers/full error:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   CHECK DRIVER ALIVE STATUS (TTL DEBUG)
   =========================================================
   What it does:
   - Checks if driver is still "alive" (active)
   - Returns TTL remaining

   When to use:
   - Debug driver heartbeat system
   - Check if driver expired

   Output:
   - alive: true/false
   - ttlSeconds:
     - >0 → seconds remaining
     - -1 → no expiration
     - -2 → key does not exist
========================================================= */
router.get("/driver/:driverId/alive", async (req, res) => {
  try {
    const redis = await getRedis();
    const { driverId } = req.params;
    console.log(`Checking alive status for driverId: ${driverId}`);

    const exists = await redis.exists(`driver:${driverId}:alive`);
    const ttl = await redis.ttl(`driver:${driverId}:alive`);

    res.json({
      driverId,
      alive: Boolean(exists),
      ttlSeconds: ttl,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   GET RIDES FROM GEO (LOCATION ONLY)
   =========================================================
   What it does:
   - Returns all rides stored in "rides:geo"
   - Includes coordinates only (no ride details)

   When to use:
   - Verify ride location stored correctly
   - Debug GEO index

   Output:
   - rideId + coordinates
========================================================= */
router.get("/rides/geo", async (req, res) => {
  try {
    const redis = await getRedis();

    const rides = await redis.zrange("rides:geo", 0, -1);

    const pipeline = redis.pipeline();

    rides.forEach((rideId) => {
      pipeline.geopos("rides:geo", rideId);
    });

    const positions = await pipeline.exec();

    const result = rides.map((rideId, index) => {
      const [err, pos] = positions[index];

      return {
        rideId,
        position: pos && pos[0] ? {
          longitude: Number(pos[0][0]),
          latitude: Number(pos[0][1])
        } : null
      };
    });

    res.json({ count: result.length, rides: result });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =========================================================
   GET RIDES DATA (HASH ONLY)
   =========================================================
   What it does:
   - Fetches all "ride:*" keys
   - Returns full ride details

   When to use:
   - Debug ride data stored in Redis
   - Check fare, status, destination

   ⚠️ Note:
   - Uses KEYS → not for production

   Output:
   - Full ride objects
========================================================= */
router.get("/rides/data", async (req, res) => {
  try {
    const redis = await getRedis();

    const keys = await redis.keys("ride:*");

    if (!keys.length) {
      return res.json({ count: 0, rides: [] });
    }

    const pipeline = redis.pipeline();

    keys.forEach((key) => {
      pipeline.hgetall(key);
    });

    const results = await pipeline.exec();

    const rides = results.map(([err, data], index) => {
      return {
        key: keys[index],
        data
      };
    });

    res.json({ count: rides.length, rides });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =========================================================
   FULL RIDES DEBUG (BEST VIEW)
   =========================================================
   What it does:
   - Combines GEO + HASH data
   - Detects stale rides (in GEO but missing HASH)

   When to use:
   - Debug full ride lifecycle
   - Detect data inconsistency

   Output:
   - position
   - ride data
   - exists flag
   - isStale flag 🔥
========================================================= */
router.get("/rides/full", async (req, res) => {
  try {
    const redis = await getRedis();

    const rideIds = await redis.zrange("rides:geo", 0, -1);

    if (!rideIds.length) {
      return res.json({ count: 0, rides: [] });
    }

    const pipeline = redis.pipeline();

    rideIds.forEach((rideId) => {
      pipeline.geopos("rides:geo", rideId);
      pipeline.hgetall(`ride:${rideId}`);
      pipeline.exists(`ride:${rideId}`);
    });

    const results = await pipeline.exec();

    const rides = [];

    for (let i = 0; i < rideIds.length; i++) {
      const geoIndex = i * 3;
      const dataIndex = geoIndex + 1;
      const existsIndex = geoIndex + 2;

      const [geoErr, geoPos] = results[geoIndex];
      const [dataErr, data] = results[dataIndex];
      const [existsErr, exists] = results[existsIndex];

      rides.push({
        rideId: rideIds[i],
        position: geoPos && geoPos[0] ? {
          longitude: Number(geoPos[0][0]),
          latitude: Number(geoPos[0][1])
        } : null,
        data,
        exists: exists === 1,
        isStale: exists !== 1
      });
    }

    res.json({ count: rides.length, rides });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;