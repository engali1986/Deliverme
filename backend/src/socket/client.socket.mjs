// src/socket/client.socket.mjs
import jwt from "jsonwebtoken";
import { getRedis } from "../redis/redisClient.mjs";
import logger from "../utils/logger.mjs";
export function registerClientSocket(io, socket) {
    console.log("Registering client socket for user:", socket.user);
    console.log("socket connected:", socket.connected);
   socket.on("clientOnline", (data, cb) => {
  console.log("Client online event received:", data);
  if (cb) cb({ ok: true });
});
    
    io.to(socket.user.id).emit('ClientID', { clientId: socket.user.id, message: 'Welcome to the client socket!' });
 } 