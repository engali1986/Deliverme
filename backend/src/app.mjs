import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectDB } from './db/connect.mjs';
// import authRoutes from './routes/authRoutes.mjs';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to database
connectDB().then((db) => {
  app.locals.db = db;
  console.log('Database connected and ready to use');
});

// Routes
// app.use('/api/auth', authRoutes);

export default app;
