// src/socket/driver.socket.mjs
import jwt from "jsonwebtoken";
import { getRedis } from "../redis/redisClient.mjs";
import logger from "../utils/logger.mjs";
import { addDriverToGeo } from "../redis/redisClient.mjs";
export function registerDriverSocket(io, socket) {

  /* =========================
     DRIVER LOCATION
  ========================= */
  socket.on("driverLocation", async (coords, ack) => {
    try {
      // Re-check token (important for long sessions)
      jwt.verify(socket.token, process.env.JWT_SECRET);

      const { latitude, longitude } = coords;
      const driverId = socket.user.id;
      await addDriverToGeo(driverId, longitude, latitude, ack);

    console.log("Driver socket ACK:", ack);  
    } catch (err) {
      logger.warn(
        `driverLocation auth failed for ${socket.user?.id}`
      );

      ack?.({ ok: false, reason: "TOKEN_EXPIRED" });
      socket.disconnect(true);
    }
  });

  /* =========================
     DRIVER HEARTBEAT (STATIONARY)
  ========================= */
  socket.on("driverHeartbeat", async (_, ack) => {
    try {
      jwt.verify(socket.token, process.env.JWT_SECRET);
      console.log(`jwt verified for driver ${socket.user?.id}`);

      const redis = await getRedis();
      const driverId = socket.user.id;

      // Refresh TTL ONLY
      await redis.set(`driver:${driverId}:alive`, 1, { EX: 120 });

      ack?.({ ok: true });
      console.log("Driver heartbeat ACK:", ack);
    } catch (err) {
      console.log("Driver heartbeat auth error:", err);
      logger.warn(`driverHeartbeat auth failed for ${socket.user?.id}`);
      ack?.({ ok: false, reason: "TOKEN_EXPIRED" });
      socket.disconnect(true);
    }
  });

}



