// src/socket/driver.socket.mjs
import jwt from "jsonwebtoken";
import { getRedis } from "../redis/redisClient.mjs";
import logger from "../utils/logger.mjs";
import { addDriverToGeo } from "../redis/redisClient.mjs";
export function registerDriverSocket(io, socket) {

   /* =========================
     DRIVER ONLINE
  ========================= */
  socket.on("driverOnline", async (Coords, ack) => {
    try {
      console.log("Driver online event received:", Coords);
      // Check for tocken validity before processing location
      if(Date.now() / 1000 > socket.user.exp){
        throw new Error("Token expired");
      }
      const redis = await getRedis();
      const driverId = socket.user.id;

      await redis.set(`driver:${driverId}:online`, 1, "EX", 120);
      await redis.set(`driver:${driverId}:socket`, socket.id, "EX", 120);


      ack?.({ ok: true });

    } catch (err) {
      logger.warn(  
        `driver:online auth failed for ${socket.user?.id}`
      );
      
      ack?.({ ok: false, reason: "TOKEN_EXPIRED" });
      socket.disconnect(true);
    }
  });
 
  /* =========================
     DRIVER LOCATION
  ========================= */
  socket.on("driverLocation", async (coords, ack) => {
    try {
      // Check for tocken validity before processing location
      if(Date.now() / 1000 > socket.user.exp){
        throw new Error("Token expired");
      }

      const { latitude, longitude } = coords;
      const driverId = socket.user.id;
      await addDriverToGeo(driverId, longitude, latitude, ack);

    console.log("Driver socket ACK:", ack);  
    } catch (err) {
      logger.warn(
        `driverLocation auth failed for ${socket.user?.id}`
      );

      ack?.({ ok: false, reason: "TOKEN_EXPIRED" });
      logger.warn(`driverLocation auth failed for ${socket.user?.id}`);
      socket.disconnect(true);
    }
  });

  /* =========================
     DRIVER HEARTBEAT (STATIONARY)
  ========================= */
  socket.on("driverHeartbeat", async (_, ack) => {
    try {
      // Check for tocken validity before processing location
      if(Date.now() / 1000 > socket.user.exp){
        throw new Error("Token expired");
      }

      const redis = await getRedis();
      const driverId = socket.user.id;

      // Refresh TTL ONLY
      await redis.set(`driver:${driverId}:alive`, 1, "EX", 120);

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



