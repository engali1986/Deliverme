import { getRedis } from '../redis/redisClient.mjs';
import logger from '../utils/logger.mjs';

export function registerDriverSocket(io, socket) {
  socket.on('driverStatus', (data) => {
    socket.broadcast.emit('driverStatus', data);
  });

  socket.on('driverLocation', async (coords, ack) => {
    try {
      const { latitude, longitude, driverId } = coords;
        const redis = await getRedis();

      await redis.geoAdd('drivers:geo', {
        longitude,
        latitude,
        member: driverId,
      });

      ack?.({ ok: true });
    } catch (err) {
      logger.error('driverLocation error: %s', err.message);
      ack?.({ ok: false });
    }
  });
}
