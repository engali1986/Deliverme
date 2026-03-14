// src/socket/client.socket.mjs
import jwt from "jsonwebtoken";
import { getRedis } from "../redis/redisClient.mjs";
import logger from "../utils/logger.mjs";
export function registerClientSocket(io, socket) {
    socket.on('ClientID', ()=>{
        logger.info(`Client ${socket.user.id} joined room ${socket.user.id}`);
    })
    socket.to(socket.user.id).emit('ClientID', { clientId: socket.user.id });
} 