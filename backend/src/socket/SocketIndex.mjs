import logger from '../utils/logger.mjs';
import { registerDriverSocket } from './driver.socket.mjs';

export function initSocket(io) {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket}, ${socket.id}`);

    registerDriverSocket(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });
}