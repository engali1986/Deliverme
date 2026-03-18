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

    const requestClientID = () => {
      socket.emit("client:getId", null, (ack) => {
        if (ack?.ok && ack?.clientId) {
          console.log("Received ClientID:", ack);
          resolve(ack.clientId);
          return;
        }
        reject(ack?.reason || "CLIENT_ID_UNAVAILABLE");
      });
    };

    if (socket.connected) {
      requestClientID();
    } else {
      socket.once("connect", () => {
        requestClientID();
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
    socket.emit("clientOnline", { message: "Client is online" }, (ack) => {
  console.log("clientOnline ack:", ack);
});
  } else {
    socket.on("connect", () => {
      console.log("Socket connected, emitting clientOnline event");
      socket.emit("clientOnline", { message: "Client is online" }, (ack) => {
  console.log("clientOnline ack:", ack);
});
    });
  }
}
 
