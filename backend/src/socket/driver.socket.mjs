// src/socket/driver.socket.mjs
/*
  Purpose
  - Handles driver-specific Socket.IO events (online, location, heartbeat).
  - Validates JWT expiry per event and updates driver presence/geo in Redis.

  Integration Points
  - Registered by `initSocket` in `./SocketIndex.mjs` for driver connections.
  - Uses Redis helpers from `../redis/redisClient.mjs` to manage:
    - Geo index (`drivers:geo`)
    - Presence keys (`driver:{id}:online`, `driver:{id}:socket`, `driver:{id}:alive`)
  - Logs via `../utils/logger.mjs`.
*/
import { addDriverToGeo, getRedis } from "../redis/redisClient.mjs";
import logger from "../utils/logger.mjs";

const DRIVER_TTL_SECONDS = 120;

function assertTokenValid(socket) {
  if (!socket?.user?.exp) throw new Error("TOKEN_EXPIRED");
  if (Date.now() / 1000 > socket.user.exp) throw new Error("TOKEN_EXPIRED");
}

function parseAndValidateCoords(coords) {
  if (!coords || typeof coords !== "object") return null;
  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}

async function refreshDriverOnline(redis, driverId, socketId) {
  const pipeline = redis.pipeline();
  pipeline.set(`driver:${driverId}:online`, 1, "EX", DRIVER_TTL_SECONDS);
  pipeline.set(`driver:${driverId}:socket`, socketId, "EX", DRIVER_TTL_SECONDS);

  const results = await pipeline.exec();
  const hasError = results?.some(([err]) => err);
  if (hasError) {
    logger.warn(`Redis pipeline error refreshing online for driver ${driverId}`, results);
  }
}

export function registerDriverSocket(io, socket) {

   /* =========================
     DRIVER ONLINE
  ========================= */
  socket.on("driverOnline", async (Coords, ack) => {
    try {
      console.log("Driver online event received:", Coords);
      // Check for token validity before processing
      assertTokenValid(socket);
      const redis = await getRedis();
      const driverId = socket.user.id;

      await refreshDriverOnline(redis, driverId, socket.id);

      ack?.({ ok: true });

    } catch (err) {
      logger.warn(  
        `driver:online auth failed for ${socket.user?.id}`
      );

      const reason = err?.message === "TOKEN_EXPIRED" ? "TOKEN_EXPIRED" : "SERVER_ERROR";
      ack?.({ ok: false, reason });
      if (reason === "TOKEN_EXPIRED") socket.disconnect(true);
    }
  });
 
  /* =========================
     DRIVER LOCATION
  ========================= */
  socket.on("driverLocation", async (coords, ack) => {
    try {
      // Check for token validity before processing location
      assertTokenValid(socket);

      const parsed = parseAndValidateCoords(coords);
      if (!parsed) {
        ack?.({ ok: false, reason: "INVALID_COORDS" });
        return;
      }

      const { latitude, longitude } = parsed;
      const driverId = socket.user.id;
      await addDriverToGeo(driverId, longitude, latitude, ack);
      const redis = await getRedis();
      await refreshDriverOnline(redis, driverId, socket.id);

    console.log("Driver socket ACK:", ack);  
    } catch (err) {
      logger.warn(
        `driverLocation auth failed for ${socket.user?.id}`
      );

      const reason = err?.message === "TOKEN_EXPIRED" ? "TOKEN_EXPIRED" : "SERVER_ERROR";
      ack?.({ ok: false, reason });
      if (reason === "TOKEN_EXPIRED") socket.disconnect(true);
    }
  });

  /* =========================
     DRIVER HEARTBEAT (STATIONARY)
  ========================= */
  socket.on("driverHeartbeat", async (_, ack) => {
    try {
      // Check for token validity before processing
      assertTokenValid(socket);

      const redis = await getRedis();
      const driverId = socket.user.id;

      // Refresh TTLs
      const pipeline = redis.pipeline();
      pipeline.set(`driver:${driverId}:online`, 1, "EX", DRIVER_TTL_SECONDS);
      pipeline.set(`driver:${driverId}:socket`, socket.id, "EX", DRIVER_TTL_SECONDS);
      pipeline.set(`driver:${driverId}:alive`, 1, "EX", DRIVER_TTL_SECONDS);
      await pipeline.exec();

      ack?.({ ok: true });
      console.log("Driver heartbeat ACK:", ack);
    } catch (err) {
      console.log("Driver heartbeat auth error:", err);
      logger.warn(`driverHeartbeat auth failed for ${socket.user?.id}`);
      const reason = err?.message === "TOKEN_EXPIRED" ? "TOKEN_EXPIRED" : "SERVER_ERROR";
      ack?.({ ok: false, reason });
      if (reason === "TOKEN_EXPIRED") socket.disconnect(true);
    }
  });

}



