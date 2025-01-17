import express from 'express';
import { clientSignUp, clientSignIn, driverSignUp, driverSignIn } from '../controllers/authController.mjs';
import dotenv from "dotenv"
dotenv.config()
const router = express.Router();

// Client Routes
router.post('/client/signup', clientSignUp);
router.post('/client/signin', clientSignIn);

// Driver Routes
router.post('/driver/signup', driverSignUp);
router.post('/driver/signin', driverSignIn);
router.get("/",(req,res)=>{
    console.log(process.env.JWT_SECRET)
    res.send("Server working")
})

export default router;
