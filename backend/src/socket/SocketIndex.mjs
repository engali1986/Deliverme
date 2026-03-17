// src/socket/SocketIndex.mjs
import jwt from "jsonwebtoken";
import logger from "../utils/logger.mjs";
import { registerDriverSocket } from "./driver.socket.mjs";
import { registerClientSocket } from "./client.socket.mjs";

import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

export async function initSocket(io) {

  /* =========================
     REDIS ADAPTER SETUP
  ========================= */

  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  logger.info("✅ Socket.IO Redis adapter connected");

  /* =========================
     AUTH MIDDLEWARE (ON CONNECT)
  ========================= */
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("Unauthorized");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("SocketIndex Decoded JWT:", decoded);

      socket.user = {
        id: decoded.id,
        name: decoded.name,
        mobile: decoded.mobile,
        role: decoded.role,
        exp: decoded.exp,
      };

      socket.token = token;
      console.log("SocketIndex User:", socket);
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  /* =========================
     CONNECTION
  ========================= */
  io.on("connection", (socket) => {
    if (socket.user.role === "driver") {
      if(socket.user.id){
        logger.info(`🟢 Driver connected: ${socket.user.id}`);
        socket.join(socket.user.id); // Join room with driver ID
      }else{
        logger.warn(`Driver connected without ID: ${socket.id}`);
      }
      
      registerDriverSocket(io, socket);
    } else {
      if(socket.user.id){
        logger.info(`🟢 Client connected: ${socket.user.id}`);
        socket.join(socket.user.id); // Join room with client ID
      }else{
        logger.warn(`Client connected without ID: ${socket.id}`);
      }
      registerClientSocket(io, socket);
    }
    socket.on("disconnect", (reason) => {
      logger.info(
        `🔴 ${socket.user.role } disconnected: ${socket.user.id} (${reason})`
      );
    });
  });
}
