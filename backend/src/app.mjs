import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectDB } from './db/connect.mjs';
import authRoutes from './routes/authRoutes.mjs';
import logger from './utils/logger.mjs';
import rateLimit from 'express-rate-limit';
import ensureIndexes  from './db/ensureIndexes.mjs'; // Import the ensureIndexes function
import { Server } from 'socket.io';

const app = express();
// Set rate limit (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.',
});
// setup socket.io
// Create HTTP server from Express app
const server = http.createServer(app);

const io = new Server(server,{
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  } 
});
io.on('connection', async (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('driverStatus', (data) => {
    console.log('Driver status update:', data);
    // Broadcast to all connected clients except the sender
    socket.broadcast.emit('driverStatus', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
server.listen(3001, () => {
  console.log('Socket.io server listening on port 3001');
});
app.set('io', io); // Make io accessible in routes via req.app.get('io')

// Apply rate limiting to all routes
app.use(limiter);

// Middleware
app.use(express.json()); // ✅ Handles JSON requests
app.use(express.urlencoded({ extended: true })); // ✅ Handles URL-encoded requests
app.use(cors({
  origin: "*", // allow all origins for testing
  methods: ["GET","POST","PUT","DELETE"],
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // ✅ Parses form-urlencoded bodie

// Connect to database
connectDB().then(async(client) => {
  const db = client.db('deliverme'); // Access the database from the client
  app.locals.db = db; // Store the db in app.locals
  logger.info('Database connected and ready to use');
  console.log('Database connected and ready to use');
  // ✅ Ensure indexes here
  await ensureIndexes(db, logger)
}).catch(error => {
  logger.error('Error while connecting to database: %s', error.message);
});
// Routes
app.use('/api/auth', authRoutes);
// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error: %s', err.message);
  res.status(500).json({ message: 'Internal server error' });
});


export default app;
