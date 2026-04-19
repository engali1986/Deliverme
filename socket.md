# Deliverme Socket Event Documentation

Last reviewed: 2026-04-19

## Scope

This document is based on the **active runtime code** in:

- `frontend/src/services/SocketManager.js`
- `frontend/src/services/ClientSocket.js`
- `frontend/src/services/DriverSocket.js`
- `frontend/src/screens/DriverHomeScreen.js`
- `backend/src/socket/SocketIndex.mjs`
- `backend/src/socket/client.socket.mjs`
- `backend/src/socket/driver.socket.mjs`
- `backend/src/workers/rideMatching.worker.mjs`

Legacy files under `backend/Drafts/` were not treated as current production flow.

## Connection and Rooms

- Frontend connects to: `http://10.114.106.200:5000` using Socket.IO websocket transport.
- JWT is sent in handshake auth: `auth: { token }`.
- Backend validates JWT in `io.use(...)` middleware.
- Room join on connect:
- Driver: `driver:{driverId}`
- Client: `client:{clientId}`

## Frontend -> Backend Events

| Event | Emitted by | Payload | Ack | Backend behavior |
|---|---|---|---|---|
| `clientOnline` | Client app (`SocketManager`, `ClientSocket`) | optional object (often `{ message: "Client is online" }`) | `{ ok: true }` or `{ ok: false, reason }` | Validates token, confirms client presence. Disconnects if token expired. |
| `client:getId` | Client app (`ClientSocket`) | `null` | `{ ok: true, clientId }` or `{ ok: false, reason }` | Returns authenticated client id from JWT (`socket.user.id`). |
| `driverOnline` | Driver app (`SocketManager`, `DriverSocket`) | optional coords object | `{ ok: true }` or `{ ok: false, reason }` | Refreshes driver online/socket/alive Redis keys. |
| `driverLocation` | Driver app (`DriverSocket`) | `{ latitude, longitude, ... }` | Success usually `{ ok: true, reason: "SUCCESS" }`; failures include `INVALID_COORDS`, `REDIS_ERROR`, `TOKEN_EXPIRED`, `SERVER_ERROR` | Validates coords, updates Redis GEO (`drivers:geo`), refreshes online keys. |
| `driverHeartbeat` | Driver app (`DriverSocket`, sent when no movement) | `{}` (or null translated to `{}` client side) | `{ ok: true }` or `{ ok: false, reason }` | Refreshes driver TTL keys without GEO update. |
| `driver:register` | Driver app (`DriverHomeScreen`) | currently sends `{ driverId, isAvailable }` | `{ ok: true }` or `{ ok: false, reason }` | Payload is not used server-side; server refreshes driver presence using JWT identity. |
| `driver:availability` | Driver app (`DriverHomeScreen`) | `{ isAvailable: boolean }` | `{ ok: true }` or `{ ok: false, reason }` | If true: refresh presence. If false: remove from GEO and delete presence keys. |

`reason` values used by backend include: `TOKEN_EXPIRED`, `SERVER_ERROR` (and `INVALID_COORDS` / `REDIS_ERROR` for location flow).

## Backend -> Frontend Events

| Event | Emitted by | Payload | Consumed in frontend |
|---|---|---|---|
| `nearby-rides` | `backend/src/socket/SocketIndex.mjs` (from Redis channel `driver:rides`) to room `driver:{id}` | `rides[]` where items include `rideId`, `pickup`, `destination`, `fare`, `status`, `expiresAt` | Yes, listened in `frontend/src/screens/DriverHomeScreen.js` (`socket.on("nearby-rides", ...)`). |
| `ride_request` | `backend/src/workers/rideMatching.worker.mjs` to room `driver:{id}` | `{ rideId, pickup, destination, fare }` | No active listener found in current `frontend/src` (exists only in comments/legacy drafts). |

## Socket.IO Lifecycle Events (Used in Frontend)

| Event | Where handled | Purpose |
|---|---|---|
| `connect` | `SocketManager`, `ClientSocket` | On connect, app emits role-specific online events. |
| `disconnect` | `SocketManager` | Logging and connection state awareness. |
| `connect_error` | `SocketManager` | Handles unauthorized handshake, clears token, disconnects, prompts relogin. |

## End-to-End Flows

### Client session bootstrap

1. Client connects with JWT.
2. Client emits `clientOnline`.
3. Client can request identity via `client:getId`.

### Driver online/location flow

1. Driver connects with JWT and joins `driver:{id}` room.
2. Driver emits `driverOnline` and `driver:register`.
3. Driver emits `driverLocation` while moving or `driverHeartbeat` when stationary.
4. Driver toggles availability via `driver:availability`.

### Ride broadcast flow

1. Worker publishes ride data to Redis channel `driver:rides`.
2. Socket bridge emits `nearby-rides` to specific driver room.
3. Driver app updates request list from `nearby-rides`.

## Review Notes

- Active frontend currently consumes `nearby-rides`, not `ride_request`.
- `driverOnline` can be emitted from two places (`SocketManager` connect and explicit `emitDriverOnline`), which may cause duplicate presence updates.
- Event naming is mixed (`driverOnline` and `driver:availability`); consider standardizing to one naming style.
