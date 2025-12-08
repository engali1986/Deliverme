// socket.js
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

let socket = null;

export async function initSocket() {
  if (socket && socket.connected) return socket;

  const token = await AsyncStorage.getItem("userToken");
  socket = io("http://10.110.22.200:5000", {
    transports: ["websocket"],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    upgrade: false,
  });

  socket.on("connect", () => {
    console.log("Socket connected", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  return socket;
}

export function getSocket() {
  return socket;
}
export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}   