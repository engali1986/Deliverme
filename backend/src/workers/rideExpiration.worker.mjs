import {connectDB} from '../db/connect.mjs';
import {removeRideFromGeo} from '../redis/redisClient.mjs';

const CHECK_INTERVAL = 10000; // 10 seconds
const BATCH_LIMIT = 50;       // Process 50 expired rides per cycle

async function processExpiredRides() {
  try {
    const dbClient = await connectDB();
    const db = dbClient.db(); // Use default database from connection URI
    const ridesCollection = db.collection("rides");

    const now = new Date();
    console.log(`Checking for expired rides at ${now.toISOString()}`);

    // Find expired pending rides (batch limited)
    const expiredRides = await ridesCollection
      .find({
        status: "pending",
        expiresAt: { $lte: now }
      })
      .limit(BATCH_LIMIT)
      .toArray();
      console.log(`Found ${expiredRides.length} expired rides to process.`);

    if (!expiredRides.length) return;

    // const io = getIO();

    for (const ride of expiredRides) {

      // Atomic update to avoid double processing
      const result = await ridesCollection.updateOne(
        {
          _id: ride._id,
          status: "pending"
        },
        {
          $set: {
            status: "expired",
            expiredAt: new Date()
          }
        }
      );

      // If already processed by another worker, skip
      if (result.modifiedCount === 0) continue;

      const rideId = ride._id.toString();

      // Remove from Redis GEO
      await removeRideFromGeo(rideId);

      // Notify all drivers to remove ride
    //   io.to("drivers").emit("rideExpired", { rideId });

      // Notify client
    //   io.to(ride.clientId.toString()).emit("rideExpired", {
    //     rideId
    //   });

      console.log(`Ride expired: ${rideId}`);
    }

  } catch (err) {
    console.error("Ride expiration worker error:", err);
  }
}


export function startRideExpirationWorker() {
  console.log("Ride Expiration Worker Started");

  setInterval(processExpiredRides, CHECK_INTERVAL);
}
startRideExpirationWorker();