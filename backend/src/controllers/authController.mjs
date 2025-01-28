import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from "nodemailer"
import logger from '../utils/logger.mjs';

dotenv.config();
let Transporter=await nodemailer.createTransport({
  service:"gmail",
  port: 587, 
  secure:true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  })

// Client Sign-Up
export async function clientSignUp(req, res,db) {
  const { email, mobile, name, password } = req.body;
  logger.info("Client Sign-Up db %s", db);
  const client = db.client; // MongoClient instance
  const session = client.startSession(); // Start session on MongoClient

  
  try {
    session.startTransaction();  // Begin transaction

    logger.info("Client Sign-Up request received for email: %s", email);

    // Check if the client already exists
    const existingClient = await db.collection("clients").findOne({ email }, { session });
    if (existingClient) {
      logger.warn("Client already exists: %s", email);
      return res.status(400).json({ message: "Client already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a random 6-digit verification number
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Insert client with clientVerified as false and save verification code
    const result = await db.collection("clients").insertOne(
      {
        email,
        mobile,
        name,
        password: hashedPassword,
        clientVerified: false,
        verificationCode,
      },
      { session }
    );

    if (!result.acknowledged) {
      throw new Error("Failed to insert client into the database");
    }

    // Send verification email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Deliverme Account",
      text: `Your verification code is: ${verificationCode}`,
    };

    await Transporter.sendMail(mailOptions);

    logger.info("Verification email sent to: %s", email);

    // Commit the transaction if everything goes fine
    await session.commitTransaction();

    res.status(201).json({
      message: "Client registered successfully. Please verify your email.",
    });
  } catch (error) {
    // If any error happens, rollback the transaction and delete the client
    await session.abortTransaction();
    logger.error("Error during Client Sign-Up: %s", error.message);

    // Optionally, you can delete the client if email sending fails
    await db.collection("clients").deleteOne({ email });

    res.status(500).json({
      message: "Server error occurred during sign-up. Please try again later.",
      error: error.message,
    });
  } finally {
    // End the session and transaction
    session.endSession();
  }
}

// Client Sign-In
export async function clientSignIn(req, res) {
  const { email, password } = req.body;
  const db = req.app.locals.db;

  try {
    const client = await db.collection('clients').findOne({ email });
    logger.info('Client Sign-In request received for email: %s', email);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const isPasswordValid = await bcrypt.compare(password, client.password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: client._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Client logged in successfully', token });
  } catch (error) {
    logger.error('Error in Client Sign-In: %s', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

// Driver Sign-Up
export async function driverSignUp(req, res) {
  const { email, mobile, name, password, driverLicensePhoto, carRegistrationPhoto, criminalRecordPhoto, personalPhoto } = req.body;
  const db = req.app.locals.db;

  try {
    const existingDriver = await db.collection('drivers').findOne({ email });
    if (existingDriver) return res.status(400).json({ message: 'Driver already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('drivers').insertOne({
      email,
      mobile,
      name,
      password: hashedPassword,
      driverLicensePhoto,
      carRegistrationPhoto,
      criminalRecordPhoto,
      personalPhoto
    });

    res.status(201).json({ message: 'Driver registered successfully' });
  } catch (error) {
    logger.error('Error in Driver Sign-Up: %s', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

// Driver Sign-In
export async function driverSignIn(req, res) {
  const { email, password } = req.body;
  const db = req.app.locals.db;

  try {
    const driver = await db.collection('drivers').findOne({ email });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const isPasswordValid = await bcrypt.compare(password, driver.password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: driver._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Driver logged in successfully', token });
  } catch (error) {
    logger.error('Error in Driver Sign-In: %s', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}
