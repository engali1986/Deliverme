# DeliverMe - Ride Sharing App

DeliverMe is a ride-sharing mobile application built using **React Native** (frontend) and **Node.js with Express and MongoDB** (backend). The app supports **driver and client accounts**, allows users to **sign up, verify their email, request rides**, and integrates **Google Drive API for storing driver documents**. It also includes **background location tracking** for drivers and real-time ride updates using **Socket.IO**.

---

## 🚀 Features

### **Client Features**
- ✅ **Sign Up & Login**: Clients can create accounts and log in securely.
- ✅ **Request a Ride**: Choose pickup location (current location or map), destination, and offer fare.
- ✅ **Interactive Map**: Displays user location, custom marker with address, and compass/North button.
- ✅ **Multi-language Support**: Instantly switch between English and Arabic.
- ✅ **Side Menu**: Access completed rides, settings, language toggle, and logout.
- ✅ **Toast Notifications**: Provides feedback for actions and errors.

### **Driver Features**
- ✅ **Sign Up with Required Documents**: Drivers upload license, registration, criminal record, and personal photo.
- ✅ **Email Verification**: Drivers verify their email via a code.
- ✅ **Login and Dashboard**: Access driver dashboard with ride requests.
- ✅ **Background Location Tracking**: Tracks driver location every 100 meters while online.
- ✅ **Real-time Ride Updates**: Receive ride requests via Socket.IO.
- ✅ **Side Menu**: Access settings, language toggle, and logout.

### **Backend Features**
- ✅ **REST API**: Handles authentication, ride requests, and document uploads.
- ✅ **JWT-based Authentication**: Secure token-based authentication for clients and drivers.
- ✅ **MongoDB Integration**: Stores user data, ride requests, and driver documents.
- ✅ **Google Drive API**: Stores driver documents securely.
- ✅ **Email Verification**: Sends verification codes for account activation.
- ✅ **Socket.IO Integration**: Enables real-time ride updates for drivers.
- ✅ **Winston Logging**: Logs server activity for debugging and monitoring.

---

## Ride request flow (current implementation)

1. Client calls POST /api/auth/client/request-ride.
   - File: ackend/src/routes/authRoutes.mjs
   - Creates a ride in MongoDB (ides collection) with status: "pending" and expiresAt.
2. The API enqueues a BullMQ job for matching.
   - Queue: ackend/src/queues/rideQueue.mjs
   - Job name: matchRide with { rideId }
3. ideMatching.worker.mjs consumes the job.
   - File: ackend/src/workers/rideMatching.worker.mjs
   - Loads the ride from MongoDB and checks expiration.
4. Worker finds nearby drivers via Redis GEO.
   - Helper: ackend/src/redis/redisClient.mjs (indNearbyDrivers)
5. Worker emits socket event to drivers.
   - Event: ide_request
   - Room: driver:{driverId}
6. Driver app listens and displays request.
   - UI listener: rontend/src/screens/DriverHomeScreen.js

Note: The worker is a separate process and must be running:

pm run ride-matching-worker

---
## 📂 Project Structure (current)
DeliverMe/
├── .gitignore
├── package.json
├── package-lock.json
├── readme.md
├── structure.txt
├── backend
│   ├── .env
│   ├── app.log
│   ├── DriveServiceAccount.json
│   ├── package.json
│   ├── package-lock.json
│   ├── server.mjs
│   └── src
│       ├── app.mjs
│       ├── controllers
│       │   ├── aa.mjs
│       │   └── authController.mjs
│       ├── db
│       │   ├── connect.mjs
│       │   └── ensureIndexes.mjs
│       ├── matching
│       ├── middlewares
│       │   ├── auth.mjs
│       │   └── uploadMiddleware.mjs
│       ├── queues
│       │   └── rideQueue.mjs
│       ├── redis
│       │   └── redisClient.mjs
│       ├── routes
│       │   ├── authRoutes.mjs
│       │   ├── redisDebugRoutes.mjs
│       │   └── ridesRoutes.mjs
│       ├── socket
│       │   ├── client.socket.mjs
│       │   ├── driver.socket.mjs
│       │   └── SocketIndex.mjs
│       ├── utils
│       │   └── logger.mjs
│       └── workers
│           ├── rideExpiration.worker.mjs
│           └── rideMatching.worker.mjs
└── frontend
    ├── .env
    ├── app.config.js
    ├── App.js
    ├── app.json
    ├── babel.config.js
    ├── eas.json
    ├── index.js
    ├── package.json
    ├── package-lock.json
    ├── assets
    │   ├── adaptive-icon.png
    │   ├── favicon.png
    │   ├── icon.png
    │   ├── splash-icon.png
    │   └── fonts
    │       ├── Poppins-Bold.ttf
    │       └── Poppins-Regular.ttf
    └── src
        ├── components
        │   ├── LanguageToggle.js
        │   ├── LogViewer.js
        │   ├── NavigationLogger.js
        │   └── toastConfig.js
        ├── context
        │   └── LanguageContext.js
        ├── hooks
        │   └── usefonts.js
        ├── i18n
        │   ├── i18n.js
        │   └── translations.json
        ├── navigation
        │   └── AppNavigator.js
        ├── screens
        │   ├── ClientHomeScreen.js
        │   ├── ClientSigninScreen.js
        │   ├── ClientSignupScreen.js
        │   ├── DriverHomeScreen.js
        │   ├── DriverSigninScreen.js
        │   ├── DriverSignupScreen.js
        │   ├── HomeScreen.js
        │   ├── MapPickerScreen.js
        │   └── SearchingDriverScreen.js
        ├── services
        │   ├── api.js
        │   ├── backgroundLocationService.js
        │   ├── ClientSocket.js
        │   ├── DriverSocket.js
        │   └── SocketManager.js
        └── utils
            ├── AppEvents.js
            ├── auth.js
            ├── localization.js
            └── Logger.js
---

## How to run (local)

Backend
```powershell
cd backend
npm install
npm run dev            # start server with nodemon
npm run ride-matching-worker   # run ride matching worker
```

Frontend
```powershell
cd frontend
npm install
npx expo start
```

Environment notes
- Create `backend/.env` with `MONGO_URI`, `JWT_SECRET`, Google Drive and Gmail credentials, and `REDIS_URL` for queues.
- Create `frontend/.env` with `API_BASE_URL` pointing to your backend.

---

## Current status

- Authentication (clients & drivers): implemented
- Email verification: implemented
- Driver document upload (Google Drive): implemented
- Map-based ride requests: implemented
- Background driver location: implemented
- Real-time notifications (Socket.IO): implemented
- Redis + BullMQ for job processing: implemented

Planned / missing
- Turn-by-turn navigation for drivers
- Full automated test coverage

---

## Notes & suggestions

- The project uses two Redis libraries: `ioredis` (for BullMQ) and `redis` (for Socket.IO adapter). Keep both error handlers attached to avoid unhandled 'error' events.
- Standardize socket event names between backend workers and frontend listeners (e.g., `ride_request` vs `newRideRequest`).

---

If you'd like, I can now:

- run the project locally and fix runtime errors,
- add `.env.example` files for backend and frontend,
- or align socket event names across the codebase and submit the changes.

File updated: [readme.md](readme.md)
  - Make sure your backend port (default: 5000) is not blocked by a firewall.



