import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import logger from '../utils/logger.mjs';

dotenv.config();

const uri = process.env.MONGO_URI;
let clientInstance = null;

const options = {
  maxPoolSize: 50,
  minPoolSize: 5,
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

export async function connectDB() {
  if (clientInstance) {
    logger.info('Reusing existing MongoDB connection');
    return clientInstance;
  }

  try {
    logger.info('Connecting to MongoDB...');
    clientInstance = new MongoClient(uri, options);
    await clientInstance.connect();
    logger.info('MongoDB connection established successfully');
    return clientInstance;
  } catch (error) {
    logger.error('Failed to connect to MongoDB: %s', error.message);
    process.exit(1);
  }
}
