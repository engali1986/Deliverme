import { initSocket, getSocket, closeSocket } from "./SocketManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addLog } from "../utils/Logger.js";

export async function getClientSocketID() {
  try {
    const socket = await getSocket();
    let clientId = "Await Client ID...";
    if (socket?.connected) {
      socket.on("ClientID", (data) => {
        console.log("Received ClientID from server:", data);
        clientId = data.clientId;
      });
    }
    return clientId;
  } catch (err) {
    console.error("Error getting client socket ID:", err);
    return null;
  }}