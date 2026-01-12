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
    const { pickup, destination, fare } = req.body;
    console.log("Request ride by client:", ClientId, "with data:", req.body);
    console.log("Ride Request type of data:", typeof pickup, typeof destination, typeof fare);
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

    // 2️⃣ Find nearby drivers (Redis GEO)
    const drivers = await findNearbyDrivers(
      pickup.longitude,
      pickup.latitude,
      5,   // km
      20   // max drivers
    );
    console.log(`Found aliveDrivers ${drivers.length} nearby drivers`, drivers);




    res.status(501).send({ message: "Not implemented" }); // Placeholder response

  }catch{

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
