/**
 * Ride Matching Worker
 * ---------------------
 * Consumes ride-matching jobs from BullMQ, loads ride data (Redis cache first,
 * MongoDB fallback), validates status/expiry, finds nearby drivers, and
 * broadcasts ride requests over Socket.IO.
 */

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

// Step 1: Socket.IO server for emitting ride requests to drivers.
// Worker does NOT listen to HTTP traffic.
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

// Step 2: Redis connection for BullMQ (and optional cache reads).
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('error', (err) => console.error('IORedis Error:', err));

/* =========================
   MONGO CONNECTION
========================= */

// Step 3: MongoDB connection for persistent ride data fallback.
const mongoClient = await connectDB();
const db = mongoClient.db("deliverme");

console.log("🚀 Ride Matching Worker Started");


/* =========================
   WORKER
========================= */

const worker = new Worker(
  "rideMatching",
  async (job) => {
    // Step 4: Extract job payload.
    const { rideId } = job.data;
    console.log('job', job.data )

    try {

      // Step 5: Resolve ride id for DB operations.
      const rideObjectId = new ObjectId(rideId);

      // Step 6: Load ride data (Redis cache first, then MongoDB fallback).
      // Redis cache is stored as a HASH (see addRideToGeo in redisClient.mjs).
      let ride = null;
      const cachedRide = await connection.hgetall(`ride:${rideId}`);
      console.log("Cached ride data from Redis:", cachedRide);
      if (cachedRide && Object.keys(cachedRide).length > 0) {
        ride = {
          _id: rideObjectId,
          status: cachedRide.status || "pending",
          fare: Number(cachedRide.fare),
          expiresAt: cachedRide.expiresAt,
          pickup: {
            type: "Point",
            coordinates: [
              Number(cachedRide.pickupLon),
              Number(cachedRide.pickupLat),
            ],
          },
          destination: {
            type: "Point",
            coordinates: [
              Number(cachedRide.destinationLon),
              Number(cachedRide.destinationLat),
            ],
          },
        };
        console.log("Ride loaded from Redis cache:", rideId);
      }

      if (!ride) {
        ride = await db.collection("rides").findOne({
          _id: rideObjectId,
          status: "pending",
        });
        console.log("Ride loaded from MongoDB:", rideId);
      }
      console.log("Ride found:", ride);

      // Step 7: Validate ride existence and state.
      if (!ride) return;
      if (ride.status && ride.status !== "pending") return;
      if (ride.expiresAt && new Date(ride.expiresAt) <= new Date()) {
        await db.collection("rides").updateOne(
          { _id: rideObjectId, status: "pending" },
          { $set: { status: "expired" } }
        );
        console.log("Ride expired, skipping matching:", rideId);
        return;
      }

      // Step 8: Find nearby drivers (Geo query via Redis).
      const drivers = await findNearbyDrivers(
        ride.pickup.coordinates[0],
        ride.pickup.coordinates[1],
        5,
      );

      console.log("Found drivers:", drivers);

      // Step 9: Broadcast ride request to each nearby driver.
      for (const [driverId] of drivers) {

        io.to(`driver:${driverId.toString()}`).emit("ride_request", {
          rideId,
          pickup: ride.pickup,
          destination: ride.destination,
          fare: ride.fare,
        });

      }

    } catch (err) {
      console.error("Matching error:", err);
      // Step 10: Let BullMQ handle retry/backoff.
      throw err; // BullMQ retry
    }
  },
  { connection }
);


worker.on("completed", job => {
  // Step 11: Completion logging.
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  // Step 12: Failure logging.
  console.error(`Job ${job.id} failed`, err);
});
