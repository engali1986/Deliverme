import { DeviceEventEmitter } from "react-native";

export const EVENTS = {
  SESSION_EXPIRED: "SESSION_EXPIRED",
};

const subscriptions = new Map();

const AppEvents = {
  emit(event, payload) {
    DeviceEventEmitter.emit(event, payload);
  },

  on(event, handler) {
    const sub = DeviceEventEmitter.addListener(event, handler);
    subscriptions.set(event, sub);
    return sub;
  },

  off(event) {
    const sub = subscriptions.get(event);
    if (sub && typeof sub.remove === "function") {
      sub.remove();
      subscriptions.delete(event);
    }
  },
};

export default AppEvents;
