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
        res.status(201).json({ message: 'Ride requested successfully', rideId });
        // now use process.nextTick to find nearby drivers and emit socket event to them
        process.nextTick(async () => {
          try {
            console.log('Finding nearby drivers for ride ID:', rideId);
            const nearbyDrivers = await findNearbyDrivers(pickup.longitude, pickup.latitude); // 5 km radius
            console.log('Nearby drivers found:', nearbyDrivers);  
          } catch (err) {
            console.error('Error in process.nextTick for finding nearby drivers', err);
          }})
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
