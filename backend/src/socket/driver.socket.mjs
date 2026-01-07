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
      const multi = redis.multi()
        .geoAdd("drivers:geo", { longitude, latitude, member: driverId })
        .set(`driver:${driverId}:alive`, 1, { EX: 15 }); // 15 sec TTL

      // avoid hanging indefinitely by racing with a timeout
      const execPromise = multi.exec();
      const res = await Promise.race([
        execPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error("Redis exec timeout")), 2000))
      ]);

      logger.info({ redisMultiRes: res });
      if (Array.isArray(res) && res.some(r => r instanceof Error)) {
        logger.warn(`Redis multi returned command error for driver ${driverId}`, { res });
      }
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
