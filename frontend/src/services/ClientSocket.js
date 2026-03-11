/**
 * socket.js
 * =========================
 * Centralized Socket.IO client manager for Deliverme Driver App
 *
 * FEATURES:
 * ----------
 * 1. Singleton socket instance
 *    - Prevents duplicate connections
 *
 * 2. Token-based authentication
 *    - JWT token is sent during connection handshake
 *
 * 3. WebSocket-only transport
 *    - Lower latency
 *    - Less battery usage on mobile
 *
 * 4. Auto-reconnection
 *    - Infinite retries
 *    - Stable for mobile networks
 *
 * 
 *
 * 5. ACK-based delivery
 *    - Confirms server receipt
 *
 * 6. Full error & lifecycle handling
 *    - connect
 *    - disconnect
 *    - connect_error
 */

import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addLog } from "../utils/Logger";
import AppEvents, { EVENTS } from "../utils/AppEvents";
import { stopBackgroundLocationTracking } from "./backgroundLocationService";

/* =========================
   CONFIGURATION
========================= */

const SOCKET_URL = "https://deliverme-el2x.onrender.com";

let socket = null;


/* =========================
   INITIALIZE SOCKET
========================= */

export async function initSocket() {
  if (socket && socket?.connected) return socket;

  const token = await AsyncStorage.getItem("userToken");
  console.log('Client Socket initializing with token:', token ? "YES" : "NO");

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    upgrade: false,
  });

  /* ---------- CONNECTION ---------- */
  socket.on("connect", async () => {
    console.log("🟢 Client Socket connected:", socket.id);
    addLog(`Client Socket connected: ${socket.id}`, "info");
    
  });

  /* ---------- DISCONNECTION ---------- */
  socket.on("disconnect", (reason) => {
    console.log("🔴 Client Socket disconnected:", reason);
    addLog(`Client Socket disconnected: ${reason}`, "warn");
  });

  /* ---------- CONNECTION ERROR ---------- */
  socket.on("connect_error", async (err) => {
    console.error("❌  Client Socket connect error:", err.message);
    addLog(`Client Socket connect error: ${err.message}`, "error");
    if (err.message === "Unauthorized") {
      await AsyncStorage.removeItem("userToken");
      socket.disconnect(); // stop infinite retries
      alert("Session expired. Please login again.");
    }
  });

  return socket;
}

// get socket id function
export async function getSocketId() {
  if (socket && socket.connected) {
    return socket.id;
  }else {
    await initSocket(); // Try to initialize if not connected
    return socket?.id || null;
  }
}


/* =========================
   HELPERS
========================= */

export function getSocket() {
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
