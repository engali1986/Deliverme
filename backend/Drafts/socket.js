/* 
  socket.js

  Purpose
  - Provide a singleton socket.io-client connection for the app.
  - Handle buffering of driver location payloads when the socket is disconnected,
    and flush buffered locations when the socket reconnects.

  Public functions
  - initSocket(): Promise<Socket>
      * Initializes (or returns existing) socket instance.
      * Reads "userToken" from AsyncStorage and passes it in the socket auth.
      * Registers connect/disconnect handlers.
      * On connect, attempts to flush stored locations from AsyncStorage key
        "pendingLocations" by emitting "driverLocationBatch" (array of coords)
        and then clears the storage key.

  - emitLocation(coords): Promise<void>
      * Emits a single "driverLocation" event when socket is connected.
      * If socket is not connected, buffers the location in AsyncStorage under
        "pendingLocations" (as { coords, timestamp }) for later flushing.
      * Uses addLog() from src/utils/Logger to record events.

  - getSocket(): Socket | null
      * Returns the current socket instance or null.

  - closeSocket(): void
      * Removes listeners, disconnects and nulls the singleton socket.

  Interactions with other files / modules
  - AsyncStorage (@react-native-async-storage/async-storage)
      * Reads "userToken" for auth and reads/writes "pendingLocations" for buffering.
  - src/utils/Logger.js
      * addLog(...) is used to record informational and warning logs.
  - src/services/backgroundLocationService.js (caller)
      * Typically emitLocation() is called from the background/foreground location
        service to forward driver GPS updates to the server.
  - Server events
      * Emits "driverLocation" for single updates and "driverLocationBatch" for
        flushing buffered locations. The server is expected to accept these events.

  Notes
  - The socket is created with { transports: ['websocket'], upgrade: false } to
    force websocket transport where supported.
  - Buffer format in AsyncStorage: JSON array of objects { coords, timestamp }.
*/


import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addLog } from "../utils/Logger";

let socket = null;

export async function initSocket() {
  if (socket && socket.connected) return socket;

  const token = await AsyncStorage.getItem("userToken");
  socket = io("http://10.129.11.200:5000", {
    transports: ["websocket"],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    upgrade: false,
  });

  socket.on("connect", async () => {
    console.log("Socket connected", socket.id);

    try {
      const stored = await AsyncStorage.getItem("pendingLocations");
      let pending = [];
      try {
        pending = stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error("Corrupted pendingLocations, resetting:", e);
        await AsyncStorage.removeItem("pendingLocations");
      }

      if (pending.length > 0) {
        console.log(`Flushing ${pending.length} buffered locations...`);
        socket.emit("driverLocationBatch", pending.map(p => p.coords));
        await AsyncStorage.removeItem("pendingLocations");
      }
    } catch (e) {
      console.error("Failed to flush buffered locations:", e);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  return socket;
}

export async function emitLocation(coords) {
  try {
    if (socket?.connected) {
      socket.emit("driverLocation", coords);
      console.log("Location emitted:", coords);
      addLog(`Location emitted: ${JSON.stringify(coords)}`, "info");
    } else {
      console.warn("Socket not connected, buffering location");
      addLog(`Buffered location: ${JSON.stringify(coords)}`, "warn");

      const stored = await AsyncStorage.getItem("pendingLocations");
      let pending = [];
      try {
        pending = stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error("Corrupted pendingLocations, resetting:", e);
      }
      pending.push({ coords, timestamp: Date.now() });
      await AsyncStorage.setItem("pendingLocations", JSON.stringify(pending));
    }
  } catch (e) {
    console.error("emitLocation error:", e);
  }
}

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