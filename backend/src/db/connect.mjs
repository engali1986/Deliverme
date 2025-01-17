import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import logger from '../utils/logger.mjs'; // Import the logger

dotenv.config();

const uri = process.env.MONGO_URI;
let dbInstance = null;

const options = {
  maxPoolSize: 50,
  minPoolSize: 5,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

export async function connectDB() {
  if (dbInstance) {
    logger.info('Reusing existing MongoDB connection');
    return dbInstance;
  }

  try {
    logger.info('Connecting to MongoDB...');
    const client = new MongoClient(uri, options);
    await client.connect();
    dbInstance = client.db('deliverme');
    logger.info('MongoDB connection established successfully');
    return dbInstance;
  } catch (error) {
    logger.error('Failed to connect to MongoDB: %s', error.message);
    process.exit(1);
  }
}
