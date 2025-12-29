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
        role: decoded.role,
      };

      socket.token = token;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  /* =========================
     CONNECTION
  ========================= */
  io.on("connection", (socket) => {
    logger.info(`🟢 Driver connected: ${socket.user.id}`);

    registerDriverSocket(io, socket);

    socket.on("disconnect", (reason) => {
      logger.info(
        `🔴 Driver disconnected: ${socket.user.id} (${reason})`
      );
    });
  });
}
