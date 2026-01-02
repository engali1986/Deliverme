import { EventEmitter } from "events";

const AppEvents = new EventEmitter();

export const EVENTS = {
  SESSION_EXPIRED: "SESSION_EXPIRED",
};

export default AppEvents;