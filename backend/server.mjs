import app from './src/app.mjs';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Create ONE HTTP server
const server = http.createServer(app);

// Create socket.io on the SAME server + SAME port
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io available to routes if needed
app.set("io", io);

// Socket.io handlers
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("driverStatus", (data) => {
    console.log("Received driverStatus for driver:", socket.id);
    console.log("Driver status:", data);
    socket.broadcast.emit("driverStatus", data);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// Start server ONCE
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Express + Socket.io running on port ${PORT}`);
});
