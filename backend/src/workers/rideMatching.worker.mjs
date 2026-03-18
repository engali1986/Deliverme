import { Worker } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
import { ObjectId } from "mongodb";
import { connectDB } from "../db/connect.mjs";
import { findNearbyDrivers } from "../redis/redisClient.mjs";

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import http from "http";

dotenv.config();

/* =========================
   SOCKET.IO (WORKER SIDE)
========================= */

// Worker does NOT listen to HTTP traffic
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('PubClient Error:', err));
subClient.on('error', (err) => console.error('SubClient Error:', err));

await pubClient.connect();
await subClient.connect();

io.adapter(createAdapter(pubClient, subClient));

console.log("✅ Worker Socket.IO Redis adapter ready");


/* =========================
   BULLMQ CONNECTION
========================= */

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('error', (err) => console.error('IORedis Error:', err));

/* =========================
   MONGO CONNECTION
========================= */

const mongoClient = await connectDB();
const db = mongoClient.db("deliverme");

console.log("🚀 Ride Matching Worker Started");


/* =========================
   WORKER
========================= */

const worker = new Worker(
  "rideMatching",
  async (job) => {
    const { rideId } = job.data;
    console.log('job', job.data )

    try {

      const ride = await db.collection("rides").findOne({
        _id: new ObjectId(rideId),
        status: "pending",
      });

      if (!ride) return;

      const drivers = await findNearbyDrivers(
        ride.pickup.coordinates[0],
        ride.pickup.coordinates[1],
        5,
      );

      console.log("Found drivers:", drivers);

      for (const [driverId] of drivers) {

        io.to(`driver:${driverId.toString()}`).emit("ride_request", {
          rideId,
          pickup: ride.pickup,
          fare: ride.fare,
        });

      }

    } catch (err) {
      console.error("Matching error:", err);
      throw err; // BullMQ retry
    }
  },
  { connection }
);


worker.on("completed", job => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed`, err);
});
