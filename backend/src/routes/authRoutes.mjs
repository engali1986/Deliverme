import express from 'express';
import { clientSignUp, clientSignIn, driverSignUp, driverSignIn } from '../controllers/authController.mjs';
import dotenv from "dotenv"
dotenv.config()
const router = express.Router();

// Client Routes
router.post('/client/signup', async (req, res) => {
    const db = req.app.locals.db;  // Access the db instance from app.locals
    await clientSignUp(req, res, db);
  });
router.post('/client/signin', clientSignIn);

// Driver Routes
router.post('/driver/signup', driverSignUp);
router.post('/driver/signin', driverSignIn);
router.get("/",(req,res)=>{
    console.log(process.env.JWT_SECRET)
    res.send("Server working")
})

export default router;
