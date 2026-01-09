// src/socket/SocketIndex.mjs
import jwt from "jsonwebtoken";
import logger from "../utils/logger.mjs";
import { registerDriverSocket } from "./driver.socket.mjs";

export function initSocket(io) {

  /* =========================
     AUTH MIDDLEWARE (ON CONNECT)
  ========================= */
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("Unauthorized");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("SocketIndex Decoded JWT:", decoded);

      // if (decoded.role !== "driver") {
      //   throw new Error("Forbidden");
      // }

      socket.user = {
        id: decoded.id,
        name: decoded.name,
        mobile: decoded.mobile,
        role: decoded.role,
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
      }
      logger.info(`🟢 Driver connected: ${socket.user.id}`);
      registerDriverSocket(io, socket);
    } else {
      logger.info(`🟢 Client connected: ${socket.user.id}`);
    }
    socket.on("disconnect", (reason) => {
      logger.info(
        `🔴 Driver disconnected: ${socket.user.id} (${reason})`
      );
    });
  });
}
