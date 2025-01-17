import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import logger from '../utils/logger.mjs';

dotenv.config();

// Client Sign-Up
export async function clientSignUp(req, res) {
  const { email, mobile, name, password } = req.body;
  const db = req.app.locals.db;

  try {
    const existingClient = await db.collection('clients').findOne({ email });
    logger.info('Client Sign-Up request received for email: %s', email);
    if (existingClient){
        logger.warn('Client already exists: %s', email);
        return res.status(400).json({ message: 'Client already exists' });
    } 

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('clients').insertOne({ email, mobile, name, password: hashedPassword });
    logger.info('Client successfully registered: %s', email);

    res.status(201).json({ message: 'Client registered successfully' });
  } catch (error) {
    logger.error('Error in Client Sign-Up: %s', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
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
