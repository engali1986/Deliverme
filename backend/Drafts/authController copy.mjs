import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from "nodemailer"
import { google } from 'googleapis';
import fs from "fs"
import logger from '../utils/logger.mjs';





dotenv.config();

// Set up OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID, // Google client ID
  process.env.CLIENT_SECRET, // Google client secret
  'https://developers.google.com/oauthplayground' // Redirect URI
);

// Set the refresh token for the client
oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

// Google Drive API with OAuth2
const drive = google.drive({ version: "v3", auth: oauth2Client });

/**
 * Creates a Google Drive folder for the driver.
 */
async function createDriverFolder(mobile) {
  try {
   
    const response = await drive.files.create({
      requestBody: {
        name: mobile,
        mimeType: "application/vnd.google-apps.folder",
        parents: [process.env.DRIVE_PARENT_FOLDER_ID],
      },
      fields: "id",
    });

    logger.info(`Google Drive folder created for driver ${mobile}, ID: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    logger.error("Error creating Google Drive folder: %s", error);
    logger.error("Error creating Google Drive folder: %s", error.message);
    throw new Error("Failed to create Google Drive folder");
  }
}

/**
 * Uploads a file to Google Drive inside the driver’s folder.
 */
async function uploadFileToDrive(filePath, fileName, folderId) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: "image/jpeg",
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });

    logger.info(`Uploaded ${fileName} to Google Drive Folder ID: ${folderId}, File ID: ${response.data.id}`);
    // ✅ Delete the local file from uploads folder after successful upload
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error(`Failed to delete file ${filePath} after upload: ${err.message}`);
      } else {
        logger.info(`Deleted file ${filePath} from uploads folder after upload.`);
      }
    });
    return response.data.id;
  } catch (error) {
    logger.error("Google Drive upload failed: %s", error.message);
    throw new Error("Document upload failed");
  }
}


// Create the nodemailer transporter
const createTransporter = async () => {
  const accessToken = await oauth2Client.getAccessToken();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      accessToken: accessToken.token,
    },
  });
};
// Send verification email to Client using OAuth2
async function sendClientVerificationEmail(email, verificationCode) {
  const transporter = await createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Deliverme Account',
    text: `Your verification code is: ${verificationCode}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Verification email sent to: %s', email);
  } catch (error) {
    logger.error('Error sending email: %s', error.message);
    throw new Error('Failed to send email');
  }
}

// Send verification email to Driver using OAuth2
async function sendDriverVerificationEmail(email, verificationCode) {
  const transporter = await createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Deliverme Account',
    text: `Your verification code is: ${verificationCode}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Verification email sent to: %s', email);
  } catch (error) {
    logger.error('Error sending email: %s', error.message);
    throw new Error('Failed to send email');
  }
}
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
    await sendClientVerificationEmail(email, verificationCode);
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
  const { email, password, verificationCode } = req.body;
  const db = req.app.locals.db;

  try {
    const client = await db.collection("clients").findOne({ email });
    if (!client) {
      logger.warn("Client not found: %s", email);
      return res.status(404).json({ message: "Client not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, client.password);
    if (!isPasswordValid) {
      logger.warn("Invalid credentials for email: %s", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if the client is verified
    if (!client.clientVerified) {
      if (!verificationCode || verificationCode !== client.verificationCode) {
        return res.status(400).json({
          message:
            "Account not verified. Please provide the correct verification code.",
        });
      }

      // Verify the client
      await db.collection("clients").updateOne(
        { email },
        { $set: { clientVerified: true }, $unset: { verificationCode: "" } }
      );

      logger.info("Client verified successfully: %s", email);
    }

    // Generate a JWT token
    const token = jwt.sign({ id: client._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "Client signed in successfully", token });
  } catch (error) {
    logger.error("Error in Client Sign-In: %s", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// Driver Sign-Up
export async function driverSignUp(req, res,db) {
  const { email, mobile, name, password } = req.body;
  logger.info("Driver Sign-Up db %s", db);
  console.log(req.body)
  const client = db.client; // MongoClient instance
  const files = req.files;
  let folderId
  let uploadedFiles = {};
  const session = client.startSession(); // Start session on MongoClient

  
  try {
    session.startTransaction();  // Begin transaction

    logger.info("Driver Sign-Up request received for email: %s", email);
    
    if (!email || !mobile || !name || !password) {
      logger.warn("Missing required fields.");
      return res.status(400).json({ message: "All fields are required." });
    }


    // Check if the Driver already exists
    const existingClient = await db.collection("drivers").findOne({ email }, { session });
    if (existingClient) {
      logger.warn("Driver already exists: %s", email);
      return res.status(400).json({ message: "Driver already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a random 6-digit verification number
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Step 1: Create Google Drive folder for driver
    folderId = await createDriverFolder(mobile);
    if (!folderId) {
      throw new Error("Failed to create Google Drive folder");
    }

    // Step 2: Upload documents to this folder
    const requiredDocs = ["license", "registration", "criminal", "personal"];
    for (const doc of requiredDocs) {
      if (!files[doc]) throw new Error(`Missing required file: ${doc}`);
      uploadedFiles[doc] = await uploadFileToDrive(files[doc][0].path, files[doc][0].originalname, folderId);
    }

    // Step 3: Store driver data in MongoDB
    const result = await db.collection("drivers").insertOne(
      {
        email,
        mobile,
        name,
        password: hashedPassword,
        driverVerified: false,
        verificationCode,
        driverPhotos: {
          folderId,
          ...uploadedFiles,
        }
      },
      { session }
    );

    if (!result.acknowledged) {
      throw new Error("Failed to insert driver into the database");
    }

    // Send verification email
    await sendDriverVerificationEmail(email, verificationCode);
    // Commit the transaction if everything goes fine
    await session.commitTransaction();

    res.status(201).json({
      message: "Driver registered successfully. Please verify your email.",
    });
  } catch (error) {
    // If any error happens, rollback the transaction and delete the Driver
    await session.abortTransaction();
    logger.error("Error during Driver Sign-Up: %s", error.message);

    if (folderId) {
      try {
        await drive.files.delete({ fileId: folderId });
        logger.info(`Rolled back Google Drive folder for driver ${mobile}`);
      } catch (deleteError) {
        logger.error("Failed to rollback Google Drive folder: %s", deleteError.message);
      }
    }


    // Optionally, you can delete the client if email sending fails
    await db.collection("drivers").deleteOne({ email });

    res.status(500).json({
      message: "Server error occurred during sign-up. Please try again later.",
      error: error.message,
    });
  } finally {
    // End the session and transaction
    session.endSession();
  }
}

// Driver Sign-Up verification
export async function verifyDriver(req, res, db) {
  const { email, verificationCode } = req.body;
  logger.info("Driver Sign-Up deriver verification received for email: %s", email);
  try {
    const driver = await db.collection("drivers").findOne({ email });

    if (!driver) {
      logger.error("Driver not found for email: %s", email);
      return res.status(400).json({ message: "Driver not found" });
    }

    if (driver.verificationCode !== verificationCode) {
      logger.error("Driver Invalid verification code email: %s", email);
      return res.status(400).json({ message: "Invalid verification code" });
    }

    const Verification=await db.collection("drivers").updateOne(
      { email },
      { $set: { driverVerified: true } }
    );

    logger.info("Driver Verification result: %s", Verification);
    if (Verification.modifiedCount>0) {
      res.status(200).json({ message: "Driver verified successfully" }); 
    }else{
      res.status(500).json({ message: "Server error", error: error.message });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
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
