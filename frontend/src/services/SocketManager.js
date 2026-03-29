import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addLog } from "../utils/Logger";
import {flushBufferedLocations} from "./DriverSocket";
import AppEvents, { EVENTS } from "../utils/AppEvents";
import { stopBackgroundLocationTracking } from "./backgroundLocationService";


/* =========================
   CONFIGURATION
========================= */

const SOCKET_URL = "http://10.97.209.200:5000";

const LOCATION_EMIT_INTERVAL = 3000; // ms (3 seconds)
const MAX_BUFFERED_LOCATIONS = 50;
const BATCH_SIZE = 20;

let socket = null;
let lastEmitTime = 0;

/* =========================
   INITIALIZE SOCKET
========================= */

export async function initSocket() {
  if (socket) return socket;

  const token = await AsyncStorage.getItem("userToken");
  const userType = await AsyncStorage.getItem("userType");
  console.log('Socket initializing with token:', token ? "YES" : "NO", 'and userType:', userType);

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
    if (userType === "driver") {
      socket.emit("driverOnline");
      addLog("Driver marked online", "info");
      await flushBufferedLocations();
    }else if (userType === "client") {
      addLog("Client marked online", "info");
      console.log("Emitting clientOnline event");
      socket.emit("clientOnline");
    }

    
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
   HELPERS
========================= */

export function getSocket() {
    
  return socket;
}

export async function closeSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
