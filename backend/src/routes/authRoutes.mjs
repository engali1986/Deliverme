import express from 'express';
import { clientSignUp, clientSignIn, verifyClient, driverSignUp, driverSignIn, verifyDriver, updateDriverAvailability } from '../controllers/authController.mjs';
import upload from "../middlewares/uploadMiddleware.mjs"
import dotenv from "dotenv"
import authenticateToken from '../middlewares/auth.mjs';
import logger from '../utils/logger.mjs';
import {ObjectId} from "mongodb"
import { findNearbyDrivers } from '../redis/redisClient.mjs';

dotenv.config()
const router = express.Router();

/*
This file defines the authentication-related routes for the application. Below is an overview of how these routes interact with other parts of the backend:

1. **Controllers**:
   - Each route delegates its core logic to functions in `authController.mjs`.
     - Example: `clientSignUp`, `driverSignIn`, etc., handle the business logic for user authentication and database operations.

2. **Middlewares**:
   - `uploadMiddleware.mjs`: Used in the `/driver/signup` route to handle file uploads (e.g., driver documents).
   - `auth.mjs`: Used in the `/driver/availability` route to verify JWT tokens for protected routes.

3. **Database**:
   - The `db` instance is accessed via `req.app.locals.db` and passed to controllers for database operations.

4. **Utilities**:
   - `logger.mjs`: Used to log important events, such as driver availability updates.

5. **Environment Variables**:
   - Loaded using `dotenv` to configure sensitive data like `JWT_SECRET`.

6. **Routes Overview**:
   - **Client Routes**:
     - `POST /client/signup`: Registers a new client.
     - `POST /client/verify`: Verifies client email.
     - `POST /client/signin`: Authenticates client login.
   - **Driver Routes**:
     - `POST /driver/signup`: Registers a new driver (with document upload).
     - `POST /driver/verify`: Verifies driver email.
     - `POST /driver/signin`: Authenticates driver login.
     - `PATCH /driver/availability`: Updates driver availability (protected route).
   - **Miscellaneous**:
     - `POST /client/request-ride`: Placeholder for ride request logic.
     - `GET /`: Health check route to verify server status.

This modular structure ensures that routes remain clean and delegate their logic to appropriate controllers and middlewares, making the codebase easier to maintain and extend.
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
    const ClientId= req.user.id
    const { pickup, destination, fare, routeDistance } = req.body;
    console.log("Request ride by client:", ClientId, "with data:", req.body);
    console.log("Ride Request type of data:", typeof pickup, typeof destination, typeof fare, typeof routeDistance);
    if(!pickup || !destination || !fare || !ClientId || fare<=0 || typeof fare!=="number" || typeof pickup!=="object" || typeof destination!=="object" ){
      return res.status(400).json({ message: "Missing required fields" });
    }
     // 1️⃣ Create ride record
    const ride = {
      clientId: new ObjectId(ClientId),
      pickup: {
        type: 'Point',
        coordinates: [pickup.longitude, pickup.latitude],
      },
      destination:{
        type: 'Point',
        coordinates: [destination.longitude, destination.latitude],
      },
      fare,
      status: 'SEARCHING',
      createdAt: new Date(),
    };
    const result = await db.collection('rides').insertOne(ride);
    console.log("Ride insertion result:", result);
    const rideId = result.insertedId.toString();
    console.log("New ride created with ID:", rideId);
    // Find drive route distance between pickup and destination using google directions api
    let distance = null; // meters
    try {
      const origin = `${pickup.latitude},${pickup.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;
      const apiKey = process.env.DIRECTIONS_API_KEY;
      console.log('Computing route distance from', origin, 'to', dest);
      // Try Google Directions API first
      if (apiKey) {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&key=${apiKey}&mode=driving`;
        const resp = await fetch(url);
        console.log('Directions API response:', resp);
        if (resp.ok) {
          const data = await resp.json();
          console.log('Directions API data:', data);
          if (data.routes && data.routes.length > 0 && data.routes[0].legs && data.routes[0].legs.length > 0) {
            distance = data.routes[0].legs[0].distance?.value ?? null; // meters
          }
        } else {
          console.warn('Directions API non-OK response', resp.status);
        }
      }

      // Fallback to haversine (straight-line) if no API key or request failed
      if (!distance) {
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
      }
      console.log('Computed route distance (meters):', distance, 'type:', typeof distance);
      // store routeDistance on the ride document
      if (distance !== null && distance> routeDistance*1000*0.8 && distance< routeDistance*1000*1.2) {
        console.log('Storing computed route distance to ride document');
        await db.collection('rides').updateOne(
          { _id: result.insertedId },
          { $set: { routeDistance: distance } }
        );
      }else{
        throw new Error("Computed distance is not within acceptable range of provided routeDistance");
      }
    } catch (err) {
      await db.collection('rides').deleteOne({ _id: result.insertedId });
      console.error('Error computing route distance', err);
      res.status(500).json({ message: err.message || 'Server error' });
      return;
    }
    // 2️⃣ Find nearby drivers (Redis GEO)
    const drivers = await findNearbyDrivers(
      pickup.longitude,
      pickup.latitude,
      5,   // km
      20   // max drivers
    );
    console.log(`authRoutes.mjs Found aliveDrivers ${drivers.length} nearby drivers`, drivers);
    // 3️⃣ Notify drivers via Socket.io
    drivers.forEach(driver => {
      console.log(`Notifying driver ${driver[0]} about new ride request ${rideId}`);  
      io.to(driver[0]).emit('newRideRequest', {
        rideId,
        pickup,
        destination,
        fare,
        routeDistance
      });
    });
    if (drivers.length === 0) {
      console.log('No drivers found nearby for ride request', rideId);
      return res.status(200).json({ message: 'No drivers available nearby' });
    }
    res.status(200).json({ message: 'Ride requested successfully', rideId });

  }catch(err){
    console.error('Error in /requestRide route:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
  }
  
);

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
