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

import { initSocket, getSocket, closeSocket } from "./SocketManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addLog } from "../utils/Logger.js";
import { stopBackgroundLocationTracking } from "./backgroundLocationService.js";
import AppEvents, { EVENTS } from "../utils/AppEvents.js";

/* =========================
   EMIT DRIVER LOCATION
========================= */
const LOCATION_EMIT_INTERVAL = 3000; // ms (3 seconds)
const MAX_BUFFERED_LOCATIONS = 50;
const BATCH_SIZE = 20;
let lastEmitTime = 0;
export async function emitLocation(coords) {
  try {
    const now = Date.now();
    const isHeartbeat=coords===null
    console.log('emitLocation called. isHeartbeat:', isHeartbeat, 'coords:', coords);
    let socket = await getSocket();

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

export async function flushBufferedLocations() {
  try {
    let socket = getSocket();
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

