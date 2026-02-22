// src/redis/redisClient.mjs
import { createClient } from 'redis';
import logger from '../utils/logger.mjs';

let redisClient;

/**
 * Initialize Redis client (singleton)
 */
async function initRedis() {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: process.env.REDIS_URL, // e.g. redis://localhost:6379
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnect failed after 10 attempts');
          return new Error('Redis unavailable');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis connecting...');
  });

  redisClient.on('ready', () => {
    logger.info('Redis connected and ready');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error: %s', err.message);
  });

  redisClient.on('end', () => {
    logger.warn('Redis connection closed');
  });

  await redisClient.connect();

  return redisClient;
}

/**
 * Get Redis client (always initialized)
 */
export async function getRedis() {
  if (!redisClient) {
    await initRedis();
  }
  return redisClient;
}

// ================================
// GEO helpers for drivers
// ================================

export async function addDriverToGeo(driverId, longitude, latitude, ack) {
  const redis = await initRedis();

  const multi = redis.multi()
        .geoAdd("drivers:geo", { longitude, latitude, member: driverId })
        .set(`driver:${driverId}:alive`, 1, { EX: 120 }); // 120 sec TTL

      // avoid hanging indefinitely by racing with a timeout
      const execPromise = multi.exec();
      const res = await Promise.race([
        execPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error("Redis exec timeout")), 2000))
      ]);

      logger.info({ redisMultiRes: res });
      if (Array.isArray(res) && res.some(r => r instanceof Error)) {
        logger.warn(`Redis multi returned command error for driver ${driverId}`, { res });
        ack?.({ ok: false, reason: "REDIS_ERROR" });
        return
      }
      logger.info(`Updated location for driver ${driverId}: (${latitude}, ${longitude})`);
    // Send ACK
      ack?.({ ok: true, reason: "SUCCESS" });
}

export async function removeDriverFromGeo(driverId) {
  const redis = await initRedis();
  await redis.zRem('drivers:geo', driverId.toString());
}

export async function findNearbyDrivers(
  longitude,
  latitude,
  radiusKm = 5,
  limit = 20
) {
  
  try {
    console.log(`Finding nearby drivers for location (${latitude}, ${longitude}) with radius ${radiusKm} km and limit ${limit}`);
    const redis = await initRedis();
    // 1️⃣ GEO search (single fast command)
 const drivers = await redis.sendCommand([
  'GEORADIUS',
  'drivers:geo',
  longitude.toString(),
  latitude.toString(),
  radiusKm.toString(),
  'km',
  'WITHDIST',
  'COUNT',
  limit.toString(),
  'ASC',
]);

  logger.info(`Found ${drivers.length} drivers near (${latitude}, ${longitude})`);
  logger.info(`Drivers from GEO search: ${JSON.stringify(drivers)}`);
  console.log('Drivers from GEO search:', JSON.stringify(drivers));

  if (!drivers.length) return [];

  // 2️⃣ Pipeline: check alive status
  const alivePipeline = redis.multi();
  drivers.forEach(([driverId,distance]) => {
    console.log('Checking alive for driver:', driverId);
    alivePipeline.exists(`driver:${driverId}:alive`);
  });

  const aliveResults = await alivePipeline.exec();
  logger.info(`Alive check results: ${JSON.stringify(aliveResults)}`);
  console.log('Alive check results:', aliveResults);

  // 3️⃣ Filter + collect stale drivers
  const aliveDrivers = [];
  const staleDrivers = [];

  if (!Array.isArray(aliveResults) || aliveResults.length === 0) {
  console.warn(
    "⚠️ aliveResults is empty or invalid — marking all drivers as stale",
    aliveResults
  );

  drivers.forEach(([driverId,distance]) => staleDrivers.push(driverId));
  return [];
  }

 drivers.forEach(([driverId, distance], index) => {
  const isAlive = aliveResults[index]; // 1 or 0
  console.log(`Driver ${driverId} alive status:`, isAlive);

  if (isAlive === 1) {
    aliveDrivers.push([driverId, distance]);
  } else {
    staleDrivers.push(driverId);
  }
});

  console.log(`Alive drivers: ${aliveDrivers.length}, Stale drivers: ${staleDrivers.length}`);

  // 4️⃣ Cleanup stale drivers (pipeline)
  if (staleDrivers.length) {
    const cleanupPipeline = redis.multi();
    staleDrivers.forEach(id =>
      cleanupPipeline.zRem("drivers:geo", id)
    );
    await cleanupPipeline.exec();
  }
  logger.info(`Returning ${aliveDrivers.length} alive drivers after cleanup, ${aliveDrivers}`);
  console.log(`Returning ${aliveDrivers.length} alive drivers after cleanup`, aliveDrivers);

  return aliveDrivers;
    
  } catch (error) {
    console.log('Error finding nearby drivers:', error);
    logger.error('Error finding nearby drivers:', JSON.stringify(error));
    
  }
}



/**
 * Graceful shutdown
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed gracefully');
  }
}
