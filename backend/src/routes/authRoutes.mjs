import express from 'express';
import { clientSignUp, clientSignIn, verifyClient, driverSignUp, driverSignIn, verifyDriver, updateDriverAvailability } from '../controllers/authController.mjs';
import upload from "../middlewares/uploadMiddleware.mjs"
import dotenv from "dotenv"
import authenticateToken from '../middlewares/auth.mjs';
import logger from '../utils/logger.mjs';
import {ObjectId} from "mongodb"
import { findNearbyDrivers, addRideToGeo } from '../redis/redisClient.mjs';
import { rideQueue } from '../queues/rideQueue.mjs';

dotenv.config()
const router = express.Router();

/*
authRoutes.mjs
==============
Purpose:
- Defines authentication and client/driver lifecycle routes.
- Provides the client ride request entry point used to create rides and trigger matching.

Key integrations:
- Controllers in authController.mjs for sign-up/sign-in/verification/availability updates.
- JWT auth middleware (authenticateToken) for protected routes.
- Upload middleware for driver signup documents.
- MongoDB via req.app.locals.db.
- Redis geo index for ride discovery (addRideToGeo).
- BullMQ ride matching queue (rideQueue).

Routes:
- POST /client/signup
- POST /client/verify
- POST /client/signin
- POST /driver/signup
- POST /driver/verify
- POST /driver/signin
- PATCH /driver/availability (protected)
- POST /client/request-ride (protected)
- GET / (health check)

Notes:
- Ride requests insert a ride into MongoDB, add it to Redis geo for fast lookup,
  and enqueue a matching job. Redis failures are logged but do not block the request.
*/

// Client Routes
router.post('/client/signup', async (req, res) => {
    const db = req.app.locals.db;  // Access the db instance from app.locals
    await clientSignUp(req, res, db);
  });
  router.post("/client/verify",async (req,res)=>{
    console.log("post client verify", req.body)
    const db = req.app.locals.db;  // Access the db instance from app.locals
    await verifyClient(req,res,db)
  })
router.post('/client/signin', async(req,res)=>{
  console.log("post client signin", req.body)
  const db = req.app.locals.db;  // Access the db instance from app.locals
  await clientSignIn(req,res,db)
});

// Driver Routes
router.post('/driver/signup',upload, async (req, res) => {
  console.log("post driver signup", req.body)
  const db = req.app.locals.db;  // Access the db instance from app.locals
  await driverSignUp(req, res, db);
});
router.post("/driver/verify",async (req,res)=>{
  console.log("post driver verify", req.body)
  const db = req.app.locals.db;  // Access the db instance from app.locals
  await verifyDriver(req,res,db)
})
router.post('/driver/signin', async(req,res)=>{
  console.log("post driver signin", req.body)
  const db = req.app.locals.db;  // Access the db instance from app.locals
  await driverSignIn(req,res,db)
});
// Request ride
router.post('/client/request-ride', authenticateToken, async (req, res) => {
  try{
    const db = req.app.locals.db;  // Access the db instance from app.locals
    const io= req.app.locals.io; // Access the Socket.io instance from app.locals
    const clientId= req.user.id
    const { pickup, destination, pickupAddress, destinationAddress, fare, routeDistance } = req.body;
    console.log("Request ride by client:", clientId, "with data:", req.body);
    console.log("Ride Request type of data:", typeof pickup, typeof destination, typeof fare, typeof routeDistance);
    if(!pickup || !destination || !fare || !clientId || fare<=0 || typeof fare!=="number" || typeof pickup!=="object" || typeof destination!=="object" ){
      return res.status(400).json({ message: "Missing required fields" });
    }
     // 1️⃣ Create ride record
     const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // Ride request expires in 2 minutes
     console.log("Creating ride with expiration time:", expiresAt.toISOString());
     console.log('expiresAt type:', typeof expiresAt, 'expiresAt value:', expiresAt);
     console.log('new Date() type:', typeof new Date(), 'new Date() value:', new Date()); 
    const ride = {
      clientId: new ObjectId(clientId),
      pickup: {
        type: 'Point',
        coordinates: [pickup.longitude, pickup.latitude],
      },
      destination:{
        type: 'Point',
        coordinates: [destination.longitude, destination.latitude],
      },
      pickupAddress,
      destinationAddress, 
      fare,
      status: 'pending',
      assignedDriverId: null,
      createdAt: new Date(),
      expiresAt, // Add expiration time to ride document
    };
    let rideId = '';
    // Find drive route distance between pickup and destination using google directions api
    let distance = null; // meters
    try {
      const origin = `${pickup.latitude},${pickup.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;
      
      console.log('Computing route distance from', origin, 'to', dest)
      // Get distance from Haversine formula
      if (pickup.latitude && pickup.longitude && destination.latitude && destination.longitude) {
        console.log('Falling back to haversine formula for distance calculation');
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371000; // Earth radius in meters
        const dLat = toRad(destination.latitude - pickup.latitude);
        const dLon = toRad(destination.longitude - pickup.longitude);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(pickup.latitude)) *
            Math.cos(toRad(destination.latitude)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); // meters
      console.log('Computed route distance (meters):', distance, 'type:', typeof distance);

      } else {
        throw new Error('Invalid pickup or destination coordinates for distance calculation');
      }
      
      // store routeDistance on the ride document
      if (distance !== null &&  distance< routeDistance*1000*1.2) {
        console.log('Computed distance is within acceptable range of provided routeDistance, proceeding to create ride');
        ride.routeDistance = distance; // Add routeDistance to ride object
        const result = await db.collection('rides').insertOne(ride);
        console.log("Ride insertion result:", result);
        rideId = result.insertedId.toString();
        console.log("New ride created with ID:", rideId);
        // Add ride to Redis geo index for quick nearby lookup
        console.log('Adding ride to redis', ride)
        const redisResult = await addRideToGeo(
          rideId,
          clientId,
          pickup,
          destination,
          pickupAddress,
          destinationAddress,
          fare,
          "pending",
          routeDistance,
          expiresAt
        );
        if (!redisResult?.ok) {
          logger.warn("Failed to add ride to Redis: %s", redisResult?.reason);
        }
        // Fire-and-forget
        rideQueue.add("matchRide", { rideId })
        .then(() => console.log("Ride added to queue"))
        .catch(err => console.error("Failed to add ride to queue", err));

        // Send response immediately
        res.status(201).json({ message: 'Ride requested successfully', rideId });
        
        
      }else{
        throw new Error("Computed distance is not within acceptable range of provided routeDistance");
      }
    } catch (err) {
      console.error('Error computing route distance', err);
      res.status(500).json({ message: err.message || 'Server error' });
      return;
    }
  } catch (err) {
    console.error('Error processing ride request', err);
    res.status(500).json({ message: 'Server error' });
  } 
   
});

// Protected route: update driver availability + optional location
router.patch('/driver/availability', authenticateToken, async (req, res) => {
  const db = req.app.locals.db;  // Access the db instance from app.locals
  try {
    // delegate to controller (controller will read req.user and req.body)
    const updateDriver= await updateDriverAvailability(req, res, db);
    logger.info('Route /driver/availability updateDrivedr', updateDriver);
  } catch (err) {
    console.error('Route /driver/availability error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check route 
router.get("/",(req,res)=>{
    console.log(process.env.JWT_SECRET)
    res.send("Server working")
})

export default router;
