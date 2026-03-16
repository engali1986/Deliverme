import { initSocket, getSocket, closeSocket } from "./SocketManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addLog } from "../utils/Logger.js";

export function getClientSocketID() {
  return new Promise((resolve, reject) => {
    const socket = getSocket();

    if (!socket) {
      reject("Socket not initialized");
      return;
    }

    const listenForClientID = () => {
      socket.once("ClientID", (data) => {
        console.log("Received ClientID:", data);
        resolve(data.clientId);
      });
    };

    if (socket.connected) {
      listenForClientID();
    } else {
      socket.once("connect", () => {
        listenForClientID();
      });
    }
  });
}
export function confirmClientOnline() {
  const socket = getSocket();
  console.log("Confirming client online. Socket state:", socket ? "exists" : "null", socket ? `connected: ${socket.connected}` : ""); 

  if (!socket) return;

  if (socket.connected) {
    console.log("Emitting clientOnline event");
    socket.emit("clientOnline", { message: "Client is online" });
  } else {
    socket.on("connect", () => {
      console.log("Socket connected, emitting clientOnline event");
      socket.emit("clientOnline", { message: "Client is online" });
    });
  }
}
 