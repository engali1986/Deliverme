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
    //  Redis multi for geo add and alive key
      await redis.multi()
      .geoAdd("drivers:geo", { longitude, latitude, member: driverId })
      .set(`driver:${driverId}:alive`, 1, { EX: 15 }) // 15 sec TTL
      .exec();
      logger.info(`Updated location for driver ${driverId}: (${latitude}, ${longitude})`);
    // Send ACK
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
