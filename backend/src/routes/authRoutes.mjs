import express from 'express';
import { clientSignUp, clientSignIn, verifyClient, driverSignUp, driverSignIn, verifyDriver } from '../controllers/authController.mjs';
import upload from "../middlewares/uploadMiddleware.mjs"
import dotenv from "dotenv"
dotenv.config()
const router = express.Router();

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
router.post('/client/request-ride', async (req, res) => {
  const db = req.app.locals.db;  // Access the db instance from app.locals
  // Implement the logic to handle ride request here
  const rideDetails = req.body;
  console.log("Ride request received:", rideDetails);
  // Placeholder response
  res.status(501).send({ message: "Not implemented" }); // Placeholder response
});

// Health check route 
router.get("/",(req,res)=>{
    console.log(process.env.JWT_SECRET)
    res.send("Server working")
})

export default router;
