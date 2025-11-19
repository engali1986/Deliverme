import { Socket } from "socket.io-client";
export let socketRef = { current: null };

export const initializeSocketConnection = (socket) => {
  socketRef.current = socket;
};  
// The above code initializes and exports a socket connection reference
// that can be used throughout the frontend application to interact with the backend socket.io server.