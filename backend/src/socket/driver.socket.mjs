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
}
