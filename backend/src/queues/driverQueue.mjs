import { Queue } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on("connect", () => {
  console.log("Connected to Redis for driverQueue");
});

connection.on("error", (err) => {
  console.error("Redis connection error for driverQueue:", err);
});

export const driverQueue = new Queue("driver-availability", {
  connection,
});