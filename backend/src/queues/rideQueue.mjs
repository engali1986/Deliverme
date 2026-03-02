import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL);
connection.on("connect", () => {
  console.log("Connected to Redis for rideQueue");
});
connection.on("error", (err) => {
  console.error("Redis connection error for rideQueue:", err);
});
export const rideQueue = new Queue("rideMatching", {
  connection,
});