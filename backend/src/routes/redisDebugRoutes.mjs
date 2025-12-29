import express from "express";
import { getRedis } from "../redis/redisClient.mjs";
import authenticateToken from "../middlewares/auth.mjs";

const router = express.Router();

/**
 * ⚠️ DEBUG ONLY
 * Protect with auth or remove in production
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

export default router;
