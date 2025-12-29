// src/socket/driver.socket.mjs
import jwt from "jsonwebtoken";
import { getRedis } from "../redis/redisClient.mjs";
import logger from "../utils/logger.mjs";

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

      const redis = await getRedis();

      await redis.geoAdd("drivers:geo", {
        longitude,
        latitude,
        member: driverId, // overwrites previous location
      });

      ack?.({ ok: true });
    } catch (err) {
      logger.warn(
        `driverLocation auth failed for ${socket.user?.id}`
      );

      ack?.({ ok: false, reason: "TOKEN_EXPIRED" });
      socket.disconnect(true);
    }
  });
}
