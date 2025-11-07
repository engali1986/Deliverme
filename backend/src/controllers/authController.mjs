import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from "nodemailer"
import { google } from 'googleapis';
import fs from "fs"
import logger from '../utils/logger.mjs';
import {PassThrough} from "stream"
import {fileURLToPath} from "url"
import path from 'path';
import { ObjectId } from 'mongodb';






dotenv.config();

const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const keyfilepath=path.join(__dirname,"../../DriveServiceAccount.json")
    console.log(path.join(__dirname,"../../DriveServiceAccount.json"))

// Load the service account key JSON file
const auth = new google.auth.GoogleAuth({
  keyFile: keyfilepath, // Path to your service account key file
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

// Google Drive API with OAuth2
const drive = google.drive({ version: "v3", auth });

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
 * Converts a buffer into a readable stream.
 */
function bufferToStream(buffer) {
  const stream = new PassThrough();
  stream.end(buffer);
  return stream;
}

/**
 * Uploads a file directly to Google Drive from memory (buffer).
 */
async function uploadFileToDrive(fileBuffer, fileName, folderId, mimeType) {
  try {
    
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: bufferToStream(fileBuffer), // Convert Buffer to Readable Stream
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });

    logger.info(`Uploaded ${fileName} to Google Drive Folder ID: ${folderId}, File ID: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    logger.error("Google Drive upload failed: %s", error.message);
    logger.error("Google Drive upload failed: %s", error);

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

/**
 * Generates a JWT token for authentication.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user._id, mobile: user.mobile, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: 60*2 } // Token expires in 2 minutes
  );
}

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
    logger.info('Verification email sent to driver: %s', email);
  } catch (error) {
    logger.error('Error sending email to driver: %s', error.message);
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

    logger.info("Client Sign-Up request received for mobile: %s", mobile);

    // Check if the client already exists
    const existingClient = await db.collection("clients").findOne({ mobile }, { session });
    if (existingClient) {
      logger.warn("Client already exists: %s", mobile);

      // Check if the client is already verified
      if (existingClient.clientVerified) {
        logger.info("Client already verified: %s", mobile);
        await session.commitTransaction();
        // If the client is already verified, return a message
        return res.status(200).json({
          message: "Client already verified",
        });
      }
      // else, send verification code to existing client
      logger.info("Client not verified, sending verification code: %s", email);

      // Reuse existing verification code or create if missing
      const verificationCode = existingClient.verificationCode || Math.floor(100000 + Math.random() * 900000).toString();

      // Update document only if verificationCode was missing
      if (!existingClient.verificationCode) {
        await db.collection("clients").updateOne(
          { mobile },
          { $set: { verificationCode } },
          { session }
        );
      }

      // Send existing verification code to existing client's email
      await sendClientVerificationEmail(existingClient.email, verificationCode);

      await session.commitTransaction();
      return res.status(201).json({
        message: "Client already exists, an email with verification code sent to your email",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a random 6-digit verification number
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

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

    return res.status(201).json({
      message: "Client registered successfully. Please verify your email.",
    });
  } catch (error) {
    // If any error happens, rollback the transaction and delete the client
    await session.abortTransaction();
    logger.error("Error during Client Sign-Up: %s", error.message);

    // Optionally, you can delete the client if email sending fails
    await db.collection("clients").deleteOne({ email,mobile });

    res.status(500).json({
      message: "Server error occurred during sign-up. Please try again later.",
      error: error.message,
    });
  } finally {
    // End the session and transaction
    session.endSession();
  }
}

// Client Sign-Up verification
export async function verifyClient(req, res, db) {
  const { mobile, verificationCode } = req.body;
  logger.info("Client verification received for mobile: %s", req.body);
  try {
    const client = await db.collection("clients").findOne({ mobile });

    if (!client) {
      logger.error("Client not found for mobile: %s", mobile);
      return res.status(400).json({ message: "Client not found" });
    }

    console.log("authController.mjs verifyClient client:",client)

    if (client.verificationCode !== verificationCode) {
      logger.error("Client Invalid verification code email: %s", client.email);
      await sendClientVerificationEmail(client.email, client.verificationCode);
      return res.status(200).json({ message: "Wrong verification code, please check your email" });
    }
    const Verification=await db.collection("clients").updateOne(
      {mobile} ,
      { $set: { clientVerified: true } }
    );

    logger.info("Client Verification result: %s", Verification);
    if (Verification.modifiedCount>0) {
      // Generate JWT token 
      const token = generateToken(client);
      res.status(200).json({
        message: "Client verified successfully",
        clientVerified: true,
        token,
        client: {
          name: client.name,
          mobile: client.mobile,
        },
      });
    }else{
      res.status(500).json({ message: "Server Verify error" });
    }
  } catch (error) {
    logger.error("Client verify error: %s", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// Client Sign-In
export async function clientSignIn(req, res,db) {
  const { mobile, password } = req.body;

  try {
    logger.info("Client Sign-In request received for mobile: %s", mobile);

    // Check if client exists
    const client = await db.collection("clients").findOne({ mobile });
    logger.info("Client Sign-In client is: %s", client);
    if (!client) {
      logger.warn("Client not found: %s", mobile);
      return res.status(404).json({ message: "Client not found" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, client.password);
    if (!isPasswordValid) {
      logger.warn("Invalid password attempt for client: %s", mobile);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    

    // Check verification status
    if (!client.clientVerified) {
      logger.info("Client not verified: %s", mobile);
      return res.status(200).json({ message: "Verification required", clientVerified: false, email:client.email });
    }

    // Generate JWT token
    const token = generateToken(client);

    // Successful login
    logger.info("Client successfully signed in: %s", mobile);
    res.status(200).json({
      message: "Sign-in successful",
      clientVerified: true,
      token,
      client: {
        name: client.name,
        mobile: client.mobile,
      },
    });
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
    const existingDriver = await db.collection("drivers").findOne({ mobile }, { session });
    if (existingDriver) {
      logger.warn("Driver already exists: %s", mobile);

      // Check if the Driver is already verified
      if (existingDriver.driverVerified) {
        logger.info("Driver already verified: %s", mobile);
        await session.commitTransaction();
        // If the Driver is already verified, return a message
        return res.status(200).json({
          message: "Driver already verified",
        });
      }

      // Reuse existing verification code or create if missing
      const verificationCode = existingDriver.verificationCode || Math.floor(100000 + Math.random() * 900000).toString();

      // Update document only if verificationCode was missing
      if (!existingDriver.verificationCode) {
        await db.collection("drivers").updateOne(
          { mobile },
          { $set: { verificationCode } },
          { session }
        );
      }

      // Send existing verification code to email
      await sendDriverVerificationEmail(existingDriver.email, verificationCode);



      await session.commitTransaction();
      return res.status(201).json({
        message: "Driver already exists, an email with verification code sent to your email",
      });
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
    const uploadedFiles = {};

for (const [key, fileArray] of Object.entries(req.files)) {
  const fileBuffer = fileArray[0].buffer; // Get file buffer from multer
  const fileName = fileArray[0].originalname;
  const mimeType = fileArray[0].mimetype;
  
  uploadedFiles[key] = await uploadFileToDrive(fileBuffer, fileName, folderId, mimeType);
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

    // // Handle duplicate key error (E11000)
    // if (error.code === 11000) {
    //   logger.warn("Duplicate key error occurred: %s", error.message);
    //   await db.collection("drivers").deleteOne({ email, mobile });
    //   if (folderId) {
    //     try {
    //       await drive.files.delete({ fileId: folderId });
    //       logger.info(`Rolled back Google Drive folder for driver ${mobile}`);
    //     } catch (deleteError) {
    //       logger.error("Failed to rollback Google Drive folder: %s", deleteError.message);
    //     }
    //   }
    //   return res.status(400).json({
    //     message: "A driver with this email already exists. Please use a different email.",
    //   });
    // }

    if (folderId) {
      try {
        await drive.files.delete({ fileId: folderId });
        logger.info(`Rolled back Google Drive folder for driver ${mobile}`);
      } catch (deleteError) {
        logger.error("Failed to rollback Google Drive folder: %s", deleteError.message);
      }
    }


    // Optionally, you can delete the client if email sending fails
    await db.collection("drivers").deleteOne({ email, mobile });

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
  const { mobile, verificationCode } = req.body;
  logger.info("Driver verification received for mobile: %s", req.body);
  try {
    const driver = await db.collection("drivers").findOne({ mobile });

    if (!driver) {
      logger.error("Driver not found for mobile: %s", mobile);
      return res.status(400).json({ message: "Driver not found" });
    }

    console.log("authController.mjs verifyDriver driver:",driver)

    if (driver.verificationCode !== verificationCode) {
      logger.error("Driver Invalid verification code email: %s", driver.email);
      await sendDriverVerificationEmail(driver.email, driver.verificationCode);
      return res.status(200).json({ message: "Wrong verification code, please check your email" });
    }
    const Verification=await db.collection("drivers").updateOne(
      {mobile} ,
      { $set: { driverVerified: true } }
    );

    logger.info("Driver Verification result: %s", Verification);
    if (Verification.modifiedCount>0) {
      // Generate JWT token 
      const token = generateToken(driver);
      res.status(200).json({
        message: "Driver verified successfully",
        driverVerified: true,
        token,
        driver: {
          name: driver.name,
          mobile: driver.mobile,
        },
      });
    }else{
      res.status(500).json({ message: "Server Verify error" });
    }
  } catch (error) {
    logger.error("Driver verify error: %s", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}


/**
 * Update driver availability and optional location (protected).
 * Expects:
 *  - req.user populated by auth middleware (contains id)
 *  - req.body.available (boolean)
 *  - optional req.body.location = { latitude, longitude }
 *
 * Updates drivers collection: isAvailable and location (GeoJSON Point).
 * Emits 'availability_updated' to driver's socketId if present.
 */
export async function updateDriverAvailability(req, res, db) {
  try {
    // db can be passed or taken from app.locals
    const database = db || req.app?.locals?.db;
    if (!database) return res.status(500).json({ message: 'Database not initialized' });

    // Require authenticated user
    const driverId = req.user?.id || req.user?._id;
    if (!driverId) return res.status(401).json({ message: 'Unauthorized' });

    const available = Boolean(req.body.available);
    const loc = req.body.location;

    const updateDoc = {
      $set: {
        isAvailable: available,
        updatedAt: new Date(),
      },
    };

    if (
      loc &&
      typeof loc.latitude === 'number' &&
      typeof loc.longitude === 'number' &&
      isFinite(loc.latitude) &&
      isFinite(loc.longitude)
    ) {
      updateDoc.$set.location = {
        type: 'Point',
        coordinates: [loc.longitude, loc.latitude],
      };
    }

    const driversColl = database.collection('drivers');

    // Use ObjectId when possible
    let filter;
    try {
      filter = ObjectId.isValid(driverId) ? { _id: new ObjectId(driverId) } : { _id: driverId };
    } catch (e) {
      // fallback if import failed for some reason
      console.warn('ObjectId conversion failed, using raw driverId');
      filter = { _id: driverId };
    }

    const result = await driversColl.findOneAndUpdate(filter, updateDoc, { returnDocument: 'after' });
    console.log("updateDriverAvailability result:",result);

    if (!result.value) {
      console.warn('Driver not found for availability update:', driverId);
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Emit socket event if io and socketId available
    try {
      const io = req.app.get('io');
      if (io && result.value.socketId) {
        io.to(result.value.socketId).emit('availability_updated', {
          available: result.value.isAvailable,
          location: result.value.location || null,
        });
      }
    } catch (emitErr) {
      // Non-fatal
      console.warn('Failed to emit availability update socket event', emitErr);
    }

    return res.json({ ok: true, available: result.value.isAvailable, location: result.value.location || null });
  } catch (err) {
    console.error('updateDriverAvailability error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Driver Sign-In

/**
 * Handles driver sign-in.
 */
export async function driverSignIn(req, res,db) {
  const { mobile, password } = req.body;

  try {
    logger.info("Driver Sign-In request received for mobile: %s", mobile);

    // Check if driver exists
    const driver = await db.collection("drivers").findOne({ mobile });
    logger.info("Driver Sign-In driver is: %s", driver);
    if (!driver) {
      logger.warn("Driver not found: %s", mobile);
      return res.status(404).json({ message: "Driver not found" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, driver.password);
    if (!isPasswordValid) {
      logger.warn("Invalid password attempt for driver: %s", mobile);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    

    // Check verification status
    if (!driver.driverVerified) {
      logger.info("Driver not verified: %s", mobile);
      await sendDriverVerificationEmail(driver.email, driver.verificationCode);
      return res.status(200).json({ message: "Verification required", driverVerified: false, email:driver.email });
    }

    // Generate JWT token
    const token = generateToken(driver);

    // Successful login
    logger.info("Driver successfully signed in: %s", mobile);
    res.status(200).json({
      message: "Sign-in successful",
      driverVerified: true,
      token,
      driver: {
        name: driver.name,
        mobile: driver.mobile,
      },
    });
  } catch (error) {
    logger.error("Error in Driver Sign-In: %s", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}


