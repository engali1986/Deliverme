// logger.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "DEV_LOGS";

export async function addLog(message, level = "info") {
  try {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { text: `[${timestamp}] ${message}`, level };

    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const logs = existing ? JSON.parse(existing) : [];
    logs.push(entry);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.warn("Failed to add log:", err);
  }
}

export async function clearLogs() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear logs:", err);
  }
}