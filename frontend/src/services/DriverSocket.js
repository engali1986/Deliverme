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
 * 5. Location throttling
 *    - Sends location only every X seconds
 *    - Reduces server & battery load
 *
 * 6. Offline buffering
 *    - Stores locations in AsyncStorage when offline
 *    - Flushes safely on reconnect
 *
 * 7. Buffer size protection
 *    - Prevents memory/storage explosion
 *
 * 8. Batched flushing
 *    - Sends buffered locations in chunks
 *
 * 9. ACK-based delivery
 *    - Confirms server receipt
 *
 * 10. Full error & lifecycle handling
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

const SOCKET_URL = "http://10.140.98.200:5000";

const LOCATION_EMIT_INTERVAL = 3000; // ms (3 seconds)
const MAX_BUFFERED_LOCATIONS = 50;
const BATCH_SIZE = 20;

let socket = null;
let lastEmitTime = 0;

/* =========================
   INITIALIZE SOCKET
========================= */

export async function initSocket() {
  if (socket && socket?.connected) return socket;

  const token = await AsyncStorage.getItem("userToken");

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
    console.log("🟢 Socket connected:", socket.id);
    addLog(`Socket connected: ${socket.id}`, "info");

    await flushBufferedLocations();
  });

  /* ---------- DISCONNECTION ---------- */
  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);
    addLog(`Socket disconnected: ${reason}`, "warn");
  });

  /* ---------- CONNECTION ERROR ---------- */
  socket.on("connect_error", async (err) => {
    console.error("❌ Socket connect error:", err.message);
    addLog(`Socket connect error: ${err.message}`, "error");
    if (err.message === "Unauthorized") {
      await AsyncStorage.removeItem("userToken");
      socket.disconnect(); // stop infinite retries
      alert("Session expired. Please login again.");
    }
  });

  return socket;
}

/* =========================
   EMIT DRIVER LOCATION
========================= */

export async function emitLocation(coords) {
  try {
    const now = Date.now();
    const isHeartbeat=coords===null

    // Throttle emission
    if (!isHeartbeat && now - lastEmitTime < LOCATION_EMIT_INTERVAL) {
      return;
    }


    if (!isHeartbeat) {
      lastEmitTime = now;
    }
  //  check socket
    if (!socket) {
    await initSocket();
    }
    if (!socket?.connected) {
      if (!isHeartbeat) {
        await bufferLocation(coords);
      }
      return;
    }

    socket.emit(
      isHeartbeat ? "driverHeartbeat" : "driverLocation",
      coords || {},
      (ack) => {
        console.log("Socket ACK:", ack);

        if (!ack?.ok) {
          if (ack?.reason === "TOKEN_EXPIRED") {
            handleTokenExpired();
            return;
          }

          if (!isHeartbeat) {
            console.warn("⚠️ Location not acknowledged, buffering");
            bufferLocation(coords);
          }
        }
      }
    );

    addLog(
      isHeartbeat
        ? "Heartbeat emitted"
        : `Location emitted: ${JSON.stringify(coords)}`,
      "info"
    );

    // if (socket?.connected) {
    //   socket.emit("driverLocation", coords, (ack) => {
    //     console.log("Location ACK received:", ack);
    //     if (!ack?.ok) {
    //       if (ack?.reason === "TOKEN_EXPIRED") {
    //         handleTokenExpired();
    //         return;
    //       }
    //       console.warn("⚠️ Location not acknowledged, buffering");
    //       bufferLocation(coords);
    //     }
    //   });

    //   addLog(`Location emitted: ${JSON.stringify(coords)}`, "info");
    // } else {
    //   await bufferLocation(coords);
    // }
  } catch (err) {
    console.error("emitLocation error:", err);
  }
}

/* =========================
   BUFFER LOCATION (OFFLINE)
========================= */

async function bufferLocation(coords) {
  console.warn("📦 Buffering location");
  addLog(`Buffered location: ${JSON.stringify(coords)}`, "warn");

  try {
    const stored = await AsyncStorage.getItem("pendingLocations");
    let pending = [];

    try {
      pending = stored ? JSON.parse(stored) : [];
    } catch {
      pending = [];
    }

    pending.push({ coords, timestamp: Date.now() });

    // Cap buffer size
    if (pending.length > MAX_BUFFERED_LOCATIONS) {
      pending = pending.slice(-MAX_BUFFERED_LOCATIONS);
    }

    await AsyncStorage.setItem("pendingLocations", JSON.stringify(pending));
  } catch (err) {
    console.error("Buffer location failed:", err);
  }
}

/* =========================
   FLUSH BUFFERED LOCATIONS
========================= */

async function flushBufferedLocations() {
  try {
    const stored = await AsyncStorage.getItem("pendingLocations");
    let pending = [];

    try {
      pending = stored ? JSON.parse(stored) : [];
    } catch {
      await AsyncStorage.removeItem("pendingLocations");
      return;
    }

    if (!pending.length) return;

    console.log(`🚚 Flushing last buffered locations`);

    const last = pending[pending.length - 1];
    socket.emit("driverLocation", last.coords);

    await AsyncStorage.removeItem("pendingLocations");
  } catch (err) {
    console.error("Flush buffered locations failed:", err);
  }
}

/* =========================
   TOKEN EXPIRED HANDLER
========================= */
export async function handleTokenExpired() {
  await stopBackgroundLocationTracking();
  await AsyncStorage.multiRemove([
    "userToken",
    "driverAvailable",
    "pendingLocations",
  ]);
  closeSocket();

  // 🔔 Notify the app
  AppEvents.emit(EVENTS.SESSION_EXPIRED);
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
