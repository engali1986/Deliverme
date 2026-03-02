import { Worker } from "bullmq";
import IORedis from "ioredis";
import { MongoClient, ObjectId } from "mongodb";
import { findNearbyDrivers } from "../redis/redisClient.mjs";

const connection = new IORedis(process.env.REDIS_URL);

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db(process.env.DB_NAME);

const worker = new Worker(
  "rideMatching",
  async job => {
    const { rideId } = job.data;

    const ride = await db.collection("rides").findOne({
      _id: new ObjectId(rideId),
      status: "pending",
    });

    if (!ride) return;

    const drivers = await findNearbyDrivers(
      ride.pickup.coordinates[0],
      ride.pickup.coordinates[1],
      5,
      5
    );

    for (const [driverId] of drivers) {
      global.io.to(driverId).emit("ride_request", {
        rideId,
        pickup: ride.pickup,
        fare: ride.fare,
      });
    }
  },
  { connection }
);

console.log("🚀 BullMQ Matching Worker Running");