// server.mjs
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import app from './src/app.mjs';
import { Server as SocketIOServer } from 'socket.io';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Create a single HTTP server for Express
    const server = http.createServer(app);

    // Configure Socket.IO on the same server
    const io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
      // transports: ['websocket'], // optional: uncomment if you want websocket-only
    });

    // Make io available to routes/middlewares
    app.set('io', io);

    // Socket.IO handlers
    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      socket.on('driverStatus', (data) => {
        console.log('Received driverStatus from', socket.id, data);
        // Broadcast to other clients (or use rooms/namespaces in production)
        socket.broadcast.emit('driverStatus', data);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', socket.id, reason);
      });
    });

    // Start listening
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Express + Socket.IO running on ${HOST}:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      try {
        io.close(); // stop socket.io
        server.close((err) => {
          if (err) {
            console.error('Error closing HTTP server:', err);
            process.exit(1);
          }
          console.log('HTTP server closed.');
          process.exit(0);
        });
        // Force exit if not closed in time
        setTimeout(() => {
          console.warn('Forcing shutdown after timeout.');
          process.exit(1);
        }, 10_000).unref();
      } catch (err) {
        console.error('Shutdown error:', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();