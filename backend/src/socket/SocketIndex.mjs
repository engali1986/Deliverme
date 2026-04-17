// src/socket/SocketIndex.mjs
/*
  Purpose
  - Initializes Socket.IO with Redis adapter for scaling.
  - Authenticates socket connections using JWT and attaches user info to the socket.
  - Routes connections to driver/client socket handlers and manages room joins.

  Integration Points
  - Called from the backend server startup (e.g., where the Socket.IO server is created).
  - Uses `../utils/logger.mjs` for structured logging.
  - Delegates event handling to:
    - `./driver.socket.mjs` for driver-specific events
    - `./client.socket.mjs` for client-specific events
  - Relies on environment variables:
    - `REDIS_URL` for Redis adapter connectivity
    - `JWT_SECRET` to verify auth tokens
*/
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
     🔥 REDIS EVENT SUBSCRIBER
     (Worker → Socket Bridge)
  ========================= */

  const eventSub = pubClient.duplicate();
  await eventSub.connect();

  // 🎯 Nearby rides for driver
  await eventSub.subscribe("driver:rides", (message) => {
    try {
      const data = JSON.parse(message);
      const { driverId, rides } = data;

      if (!driverId) return;

      io.to(`driver:${driverId}`).emit("nearby-rides", rides);

      logger.info(
        `📡 Sent ${rides?.length || 0} rides to driver ${driverId}`
      );
    } catch (err) {
      logger.error("Redis subscriber error (driver:rides): %o", err);
    }
  });


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
      // Avoid logging full socket object (may include sensitive data)
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
        socket.join(`driver:${socket.user.id}`); // Role-scoped room
        console.log(`Driver ${socket.user.id} joined room driver:${socket.user.id}`);
      }else{
        logger.warn(`Driver connected without ID: ${socket.id}`);
      }
      
      registerDriverSocket(io, socket);
    } else {
      if(socket.user.id){
        logger.info(`🟢 Client connected: ${socket.user.id}`);
        socket.join(`client:${socket.user.id}`); // Role-scoped room
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

