// src/socket/client.socket.mjs
/*
  Purpose
  - Handles client-specific Socket.IO events and emits client-side notifications.
  - Validates JWT expiry per event for long-lived connections.

  Integration Points
  - Registered by `initSocket` in `./SocketIndex.mjs` for client connections.
  - Uses `client:{id}` room naming set in `SocketIndex.mjs`.
  - Logs via `../utils/logger.mjs`.
*/
import logger from "../utils/logger.mjs";

function assertTokenValid(socket) {
  if (!socket?.user?.exp) throw new Error("TOKEN_EXPIRED");
  if (Date.now() / 1000 > socket.user.exp) throw new Error("TOKEN_EXPIRED");
}

export function registerClientSocket(io, socket) {
  console.log("Registering client socket for user:", socket.user);
  console.log("socket connected:", socket.connected);

  socket.on("clientOnline", (data, cb) => {
    try {
      assertTokenValid(socket);
      console.log("Client online event received:", data);
      cb?.({ ok: true });
    } catch (err) {
      logger.warn(`clientOnline auth failed for ${socket.user?.id}`);
      const reason = err?.message === "TOKEN_EXPIRED" ? "TOKEN_EXPIRED" : "SERVER_ERROR";
      cb?.({ ok: false, reason });
      if (reason === "TOKEN_EXPIRED") socket.disconnect(true);
    }
  });

  // ClientID request-response to avoid race with listener registration
  socket.on("client:getId", (_, cb) => {
    try {
      assertTokenValid(socket);
      cb?.({ ok: true, clientId: socket.user?.id });
    } catch (err) {
      logger.warn(`client:getId auth failed for ${socket.user?.id}`);
      const reason = err?.message === "TOKEN_EXPIRED" ? "TOKEN_EXPIRED" : "SERVER_ERROR";
      cb?.({ ok: false, reason });
      if (reason === "TOKEN_EXPIRED") socket.disconnect(true);
    }
  });
} 
