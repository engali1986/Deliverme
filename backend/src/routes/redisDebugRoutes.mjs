import express from "express";
import { getRedis } from "../redis/redisClient.mjs";

const router = express.Router();

/**
 * ⚠️ DEBUG ONLY
  * Routes to inspect Redis-stored driver locations.
 */

/* =========================
   GET ALL DRIVERS IN GEO
========================= */
router.get("/drivers", async (req, res) => {
  try {
    const redis = await getRedis();
    const drivers = await redis.zRange("drivers:geo", 0, -1);
    console.log('redisDebugRoutes - drivers:', drivers);

    res.json({
      count: drivers.length,
      drivers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET DRIVER LOCATION
========================= */
router.get("/driver/:driverId", async (req, res) => {
  try {
    const redis = await getRedis();
    const { driverId } = req.params;

    const pos = await redis.geoPos("drivers:geo", driverId);

    if (!pos[0]) {
      return res.status(404).json({ message: "Driver not found in Redis" });
    }

    res.json({
      driverId,
      longitude: pos[0].longitude,
      latitude: pos[0].latitude,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   NEARBY DRIVERS
========================= */
router.get("/nearby", async (req, res) => {
  try {
    const redis = await getRedis();
    const { lat, lng, radius = 5 } = req.query;

    const drivers = await redis.geoSearch(
      "drivers:geo",
      {
        longitude: Number(lng),
        latitude: Number(lat),
      },
      {
        radius: Number(radius),
        unit: "km",
      }
    );

    res.json({
      count: drivers.length,
      drivers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   GET ALL DRIVERS WITH COORDS
========================= */
router.get("/drivers/full", async (req, res) => {
  try {
    const redis = await getRedis();

    // 1️⃣ Get all driver IDs
    const driverIds = await redis.zRange("drivers:geo", 0, -1);

    if (!driverIds.length) {
      return res.json({
        count: 0,
        drivers: [],
      });
    }

    // 2️⃣ Get positions for all drivers in ONE call
    const positions = await redis.geoPos("drivers:geo", driverIds);

    // 3️⃣ Merge IDs + coordinates
    const drivers = driverIds.map((driverId, index) => {
      const pos = positions[index];

      if (!pos) return null;

      return {
        driverId,
        latitude: pos.latitude,
        longitude: pos.longitude,
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

/* =========================
   CHECK DRIVER ALIVE STATUS
========================= */
router.get("/driver/:driverId/alive", async (req, res) => {
  try {
    const redis = await getRedis();
    const { driverId } = req.params;

    const exists = await redis.exists(`driver:${driverId}:alive`);
    const ttl = await redis.ttl(`driver:${driverId}:alive`);

    res.json({
      driverId,
      alive: Boolean(exists),
      ttlSeconds: ttl, // -1 = no TTL, -2 = key does not exist
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
