# SOCKETS.md

## Overview

This document defines the Socket.IO event contract for the **Deliverme** ride-hailing application. It is the single source of truth for event names, payloads, expected responses, and common communication flows between the frontend and backend.

Using this document helps keep socket communication consistent, maintainable, and easy to debug as the project grows.

---

## Goals

* Keep all socket events in one place.
* Prevent event name typos and duplicated logic.
* Make frontend and backend communication easy to understand.
* Document payload structures and expected responses.
* Support debugging, scaling, and onboarding.

---

## Naming Convention

Use a structured event naming style:

```text
<domain>:<action>
```

### Examples

* `auth:join`
* `driver:update_location`
* `ride:request`
* `ride:accepted`
* `ride:cancelled`
* `chat:message`
* `system:error`

### Rules

* Use lowercase letters.
* Use `:` to separate domain and action.
* Keep names descriptive and consistent.
* Avoid vague names like `data`, `update`, or `message1`.

---

## Socket Connection Lifecycle

### 1) Connect

When the socket connection is established, the client should identify itself.

**Typical use cases:**

* Authenticate the user.
* Register the socket with the server.
* Join role-based rooms.

### 2) Join Room

The server may place the socket into a room based on the user role or active ride.

**Examples:**

* `driver:{driverId}`
* `client:{clientId}`
* `ride:{rideId}`

### 3) Emit Events

The client or server emits events according to the event contract in this document.

### 4) Disconnect

When the socket disconnects, the server should clean up temporary state and mark the user accordingly if needed.

---

## Shared Data Structures

### Location Object

```json
{
  "latitude": 29.3759,
  "longitude": 47.9774
}
```

### Ride Object

```json
{
  "rideId": "string",
  "clientId": "string",
  "driverId": "string | null",
  "pickupLocation": {
    "latitude": 0,
    "longitude": 0
  },
  "destination": {
    "latitude": 0,
    "longitude": 0
  },
  "status": "requested | searching | accepted | arrived | started | completed | cancelled",
  "createdAt": "string"
}
```

### Driver Object

```json
{
  "driverId": "string",
  "name": "string",
  "phone": "string",
  "isAvailable": true,
  "location": {
    "latitude": 0,
    "longitude": 0
  }
}
```

### Error Object

```json
{
  "message": "string",
  "code": "string",
  "details": {}
}
```

---

## Event Reference

# Authentication & Presence

---

## `auth:join`

**Direction:** Client → Server

**Description:**
Registers the connected user and joins the appropriate room.

**Payload:**

```json
{
  "userId": "string",
  "role": "client | driver",
  "token": "string"
}
```

**Server action:**

* Validate token.
* Store socket-user mapping.
* Join role-based room.

**Success response:**

* `auth:joined`

**Failure response:**

* `system:error`

---

## `auth:joined`

**Direction:** Server → Client

**Description:**
Confirms that the user has been successfully registered on the socket server.

**Payload:**

```json
{
  "userId": "string",
  "role": "client | driver",
  "socketId": "string"
}
```

---

## `presence:online`

**Direction:** Server → Client / Server → Driver

**Description:**
Indicates that a user is online and available for socket communication.

**Payload:**

```json
{
  "userId": "string",
  "role": "client | driver",
  "status": "online"
}
```

---

## `presence:offline`

**Direction:** Server → Client / Server → Driver

**Description:**
Indicates that a user disconnected or is no longer reachable.

**Payload:**

```json
{
  "userId": "string",
  "role": "client | driver",
  "status": "offline"
}
```

---

# Driver Availability & Location

---

## `driver:update_location`

**Direction:** Driver → Server

**Description:**
Updates the driver’s live location.

**Payload:**

```json
{
  "driverId": "string",
  "location": {
    "latitude": 0,
    "longitude": 0
  },
  "heading": 0,
  "speed": 0
}
```

**Server action:**

* Validate payload.
* Save/update driver location.
* Optionally broadcast to active ride or nearby services.

**Success response:**

* `driver:location_updated`

**Failure response:**

* `system:error`

---

## `driver:location_updated`

**Direction:** Server → Driver

**Description:**
Confirms that the server received the driver location update.

**Payload:**

```json
{
  "driverId": "string",
  "updatedAt": "string"
}
```

---

## `driver:set_available`

**Direction:** Driver → Server

**Description:**
Marks a driver as available for ride requests.

**Payload:**

```json
{
  "driverId": "string",
  "available": true
}
```

**Success response:**

* `driver:availability_changed`

---

## `driver:set_unavailable`

**Direction:** Driver → Server

**Description:**
Marks a driver as unavailable.

**Payload:**

```json
{
  "driverId": "string",
  "available": false
}
```

**Success response:**

* `driver:availability_changed`

---

## `driver:availability_changed`

**Direction:** Server → Driver / Client → UI update

**Description:**
Confirms a change in driver availability.

**Payload:**

```json
{
  "driverId": "string",
  "available": true,
  "updatedAt": "string"
}
```

---

# Ride Request Flow

---

## `ride:request`

**Direction:** Client → Server

**Description:**
Creates a new ride request.

**Payload:**

```json
{
  "clientId": "string",
  "pickupLocation": {
    "latitude": 0,
    "longitude": 0
  },
  "pickupAddress": "string",
  "destination": {
    "latitude": 0,
    "longitude": 0
  },
  "destinationAddress": "string",
  "notes": "string"
}
```

**Server action:**

* Validate request.
* Create ride record.
* Search for nearby available drivers.
* Send ride offer to selected drivers.

**Success response:**

* `ride:created`
* `driver:new_ride_offer`

**Failure response:**

* `ride:request_failed`
* `system:error`

---

## `ride:created`

**Direction:** Server → Client

**Description:**
Confirms that the ride request was created successfully.

**Payload:**

```json
{
  "rideId": "string",
  "status": "requested"
}
```

---

## `driver:new_ride_offer`

**Direction:** Server → Driver

**Description:**
Notifies a driver about a new nearby ride request.

**Payload:**

```json
{
  "rideId": "string",
  "clientId": "string",
  "pickupLocation": {
    "latitude": 0,
    "longitude": 0
  },
  "pickupAddress": "string",
  "destinationAddress": "string",
  "distanceToPickup": 0,
  "estimatedPickupTime": 0,
  "fareEstimate": 0
}
```

---

## `driver:accept_ride`

**Direction:** Driver → Server

**Description:**
Driver accepts a ride request.

**Payload:**

```json
{
  "rideId": "string",
  "driverId": "string"
}
```

**Server action:**

* Verify the ride is still available.
* Assign the driver.
* Update ride status.
* Notify the client.
* Notify other drivers to stop offering the ride.

**Success response:**

* `ride:accepted`
* `client:driver_assigned`

**Failure response:**

* `ride:accept_failed`
* `system:error`

---

## `ride:accepted`

**Direction:** Server → Driver

**Description:**
Confirms that the driver has successfully accepted the ride.

**Payload:**

```json
{
  "rideId": "string",
  "driverId": "string",
  "status": "accepted"
}
```

---

## `client:driver_assigned`

**Direction:** Server → Client

**Description:**
Informs the client that a driver has been assigned.

**Payload:**

```json
{
  "rideId": "string",
  "driver": {
    "driverId": "string",
    "name": "string",
    "phone": "string",
    "vehicle": "string"
  },
  "status": "accepted"
}
```

---

## `ride:declined`

**Direction:** Driver → Server

**Description:**
Driver declines a ride offer.

**Payload:**

```json
{
  "rideId": "string",
  "driverId": "string",
  "reason": "string"
}
```

**Server action:**

* Mark the offer as declined for that driver.
* Optionally offer the ride to the next driver.

---

## `ride:request_failed`

**Direction:** Server → Client

**Description:**
Indicates that ride creation or driver matching failed.

**Payload:**

```json
{
  "message": "No available drivers found",
  "code": "NO_DRIVERS_AVAILABLE"
}
```

---

# Ride Status Flow

---

## `ride:arrived`

**Direction:** Driver → Server

**Description:**
Driver indicates arrival at pickup location.

**Payload:**

```json
{
  "rideId": "string",
  "driverId": "string"
}
```

**Success response:**

* `client:driver_arrived`
* `ride:status_changed`

---

## `client:driver_arrived`

**Direction:** Server → Client

**Description:**
Notifies the client that the driver has arrived.

**Payload:**

```json
{
  "rideId": "string",
  "status": "arrived"
}
```

---

## `ride:start`

**Direction:** Driver → Server

**Description:**
Marks the ride as started.

**Payload:**

```json
{
  "rideId": "string",
  "driverId": "string"
}
```

**Success response:**

* `client:ride_started`
* `ride:status_changed`

---

## `client:ride_started`

**Direction:** Server → Client

**Description:**
Notifies the client that the trip has started.

**Payload:**

```json
{
  "rideId": "string",
  "status": "started"
}
```

---

## `ride:complete`

**Direction:** Driver → Server

**Description:**
Marks the ride as completed.

**Payload:**

```json
{
  "rideId": "string",
  "driverId": "string"
}
```

**Success response:**

* `client:ride_completed`
* `ride:status_changed`

---

## `client:ride_completed`

**Direction:** Server → Client

**Description:**
Notifies the client that the ride is complete.

**Payload:**

```json
{
  "rideId": "string",
  "status": "completed",
  "fare": 0
}
```

---

## `ride:cancel`

**Direction:** Client → Server

**Description:**
Cancels a ride request or active ride.

**Payload:**

```json
{
  "rideId": "string",
  "clientId": "string",
  "reason": "string"
}
```

**Server action:**

* Cancel the ride.
* Notify the driver.
* Free driver for new requests if applicable.

**Success response:**

* `driver:ride_cancelled`
* `ride:status_changed`

---

## `driver:ride_cancelled`

**Direction:** Server → Driver

**Description:**
Notifies the driver that the ride has been cancelled.

**Payload:**

```json
{
  "rideId": "string",
  "status": "cancelled",
  "reason": "string"
}
```

---

## `ride:status_changed`

**Direction:** Server → Client / Driver

**Description:**
Broadcasts any ride status update.

**Payload:**

```json
{
  "rideId": "string",
  "status": "requested | accepted | arrived | started | completed | cancelled",
  "updatedAt": "string"
}
```

---

# Chat / Messaging

---

## `chat:send_message`

**Direction:** Client / Driver → Server

**Description:**
Sends a chat message within a ride session.

**Payload:**

```json
{
  "rideId": "string",
  "fromUserId": "string",
  "toUserId": "string",
  "message": "string",
  "sentAt": "string"
}
```

**Success response:**

* `chat:new_message`

---

## `chat:new_message`

**Direction:** Server → Client / Driver

**Description:**
Delivers a chat message to the recipient.

**Payload:**

```json
{
  "rideId": "string",
  "fromUserId": "string",
  "toUserId": "string",
  "message": "string",
  "sentAt": "string"
}
```

---

## `chat:typing`

**Direction:** Client / Driver → Server

**Description:**
Indicates that the user is typing.

**Payload:**

```json
{
  "rideId": "string",
  "fromUserId": "string",
  "isTyping": true
}
```

**Broadcast:**

* `chat:typing_status`

---

## `chat:typing_status`

**Direction:** Server → Client / Driver

**Description:**
Shows typing status to the other participant.

**Payload:**

```json
{
  "rideId": "string",
  "fromUserId": "string",
  "isTyping": true
}
```

---

# Notifications

---

## `notification:push`

**Direction:** Server → Client / Driver

**Description:**
Sends a generic real-time notification.

**Payload:**

```json
{
  "title": "string",
  "body": "string",
  "type": "string",
  "referenceId": "string"
}
```

---

## `notification:read`

**Direction:** Client / Driver → Server

**Description:**
Marks a notification as read.

**Payload:**

```json
{
  "notificationId": "string"
}
```

---

# System Events

---

## `system:error`

**Direction:** Server → Client / Driver

**Description:**
Generic error event used across the socket layer.

**Payload:**

```json
{
  "message": "string",
  "code": "string",
  "details": {}
}
```

**Common error codes:**

* `INVALID_PAYLOAD`
* `UNAUTHORIZED`
* `NOT_FOUND`
* `RIDE_ALREADY_ASSIGNED`
* `NO_DRIVERS_AVAILABLE`
* `RATE_LIMITED`
* `INTERNAL_ERROR`

---

## `system:ping`

**Direction:** Client → Server

**Description:**
Heartbeat event used to keep the connection alive or measure latency.

**Payload:**

```json
{
  "timestamp": "string"
}
```

**Response:**

* `system:pong`

---

## `system:pong`

**Direction:** Server → Client

**Description:**
Heartbeat response.

**Payload:**

```json
{
  "timestamp": "string"
}
```

---

# Suggested Rooms

Use socket rooms to simplify broadcasting.

### User Rooms

* `client:{clientId}`
* `driver:{driverId}`

### Ride Rooms

* `ride:{rideId}`

### Broadcast Rooms

* `drivers:available`
* `drivers:nearby`
* `clients:active`

---

# Recommended Project Structure

```text
src/
  sockets/
    index.js
    events.js
    handlers/
      auth.handlers.js
      driver.handlers.js
      ride.handlers.js
      chat.handlers.js
      notification.handlers.js
      system.handlers.js
    validators/
      auth.schemas.js
      driver.schemas.js
      ride.schemas.js
      chat.schemas.js
```

---

# Example Usage

## Frontend

```js
socket.emit("ride:request", {
  clientId,
  pickupLocation,
  pickupAddress,
  destination,
  destinationAddress,
});

socket.on("client:driver_assigned", (data) => {
  console.log("Driver assigned:", data);
});
```

## Backend

```js
socket.on("ride:request", async (payload) => {
  // validate payload
  // create ride
  // find drivers
  // emit offers
});
```

---

# Logging Guidelines

For easier debugging, log socket events in a consistent format.

```text
[SOCKET][RECEIVE] ride:request { ... }
[SOCKET][SEND] client:driver_assigned { ... }
[SOCKET][ERROR] system:error { ... }
```

### Best practices

* Log event name.
* Log user ID and ride ID when available.
* Do not log sensitive tokens or secrets.
* Keep logs structured if possible.

---

# Validation Guidelines

Every incoming socket payload should be validated before use.

Recommended approach:

* Use `zod`, `joi`, or a custom validator.
* Reject invalid payloads early.
* Return `system:error` with a useful code.

---

# Versioning

If the socket contract changes significantly, version it.

### Example

* `v1:ride:request`
* `v1:client:driver_assigned`

This is useful when older mobile app versions may still be in use.

---

# Maintenance Rules

1. Add every new event to this document.
2. Keep event names consistent.
3. Update payload examples whenever the schema changes.
4. Remove unused events only after verifying no client still depends on them.
5. Keep frontend and backend event names in sync.

---

# Event Flow Summary

## Ride Request Flow

1. Client emits `ride:request`
2. Server creates ride and finds drivers
3. Server emits `driver:new_ride_offer`
4. Driver emits `driver:accept_ride`
5. Server emits `client:driver_assigned`
6. Driver updates arrival/start/complete status
7. Server broadcasts status changes to client and driver

---

# Final Notes

This document should be treated as the authoritative socket contract for the Deliverme app.

Whenever a new socket event is added, changed, or removed:

* update this file,
* update the frontend handler,
* update the backend handler,
* and test the full flow end to end.
