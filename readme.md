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

## 📂 Project Structure

### **Frontend**
```
DeliverMe/
│
├── backend/
│   ├── server.mjs                # Main server file for backend
│   ├── .env                      # Environment variables for backend
│   ├── DriveServiceAccount.json  # Google Drive API credentials
│   ├── package.json              # Backend dependencies and scripts
│   ├── Drafts/                   # Draft files for development
│   │   ├── api.js                # Draft API implementation
│   │   ├── app.config.json       # Draft app configuration
│   │   ├── ClientHomeScreen.js   # Draft client home screen logic
│   │   ├── DriverHomeScreen.js   # Draft driver home screen logic
│   │   └── ...other files        # Additional draft files
│   └── src/                      # Main backend source code
│       ├── app.mjs               # Backend app entry point
│       ├── controllers/          # Controllers for handling requests
│       │   ├── authController.mjs # Authentication logic
│       ├── db/                   # Database connection and setup
│       │   ├── connect.mjs       # MongoDB connection setup
│       ├── middlewares/          # Middleware functions
│       │   ├── auth.mjs          # Authentication middleware
│       ├── routes/               # API routes
│       │   ├── authRoutes.mjs    # Authentication routes
│       └── utils/                # Utility functions
│           ├── logger.mjs        # Logging utility
│
├── frontend/
│   ├── App.js                    # Main entry point for React Native app
│   ├── app.json                  # App configuration for Expo
│   ├── babel.config.js           # Babel configuration
│   ├── index.js                  # App initialization
│   ├── .env                      # Environment variables for frontend
│   ├── assets/                   # Static assets like images and fonts
│   └── src/                      # Main frontend source code
│       ├── screens/              # Screens for the app
│       │   ├── ClientHomeScreen.js # Client home screen UI
# DeliverMe — Ride Sharing App

DeliverMe is a mobile ride-hailing project with a React Native frontend and a Node.js backend using MongoDB. This README summarizes the repository's current status, technologies, and how to run the project locally.

---

## Quick summary

- Frontend: React Native (Expo) app with Socket.IO client, maps, background location, and i18n (English / Arabic).
- Backend: Node.js (ESM) with Express, Socket.IO, MongoDB (native driver), Redis + BullMQ for queues, and Google Drive integration for driver documents.

---

## Technologies

- Frontend
  - React Native (Expo)
  - socket.io-client
  - react-navigation
  - react-native-maps
  - expo-location / expo-task-manager (background location)

- Backend
  - Node.js (ESM), Express
  - MongoDB (mongodb native driver)
  - Socket.IO + @socket.io/redis-adapter
  - Redis (ioredis / redis), BullMQ (queues)
  - Google Drive API (service account)
  - Winston (logging)

---

## Project tree (high-level)

DeliverMe/

- backend/
  - server.mjs
  - DriveServiceAccount.json
  - package.json
  - src/
    - app.mjs
    - controllers/
    - db/
    - middlewares/
    - routes/
    - socket/
    - workers/ (rideMatching.worker.mjs, rideExpiration.worker.mjs)

- frontend/
  - App.js / index.js
  - app.json
  - package.json
  - src/
    - screens/ (ClientHomeScreen.js, DriverHomeScreen.js, etc.)
    - services/ (api.js, DriverSocket.js, backgroundLocationService.js)
    - components/, i18n/, hooks/

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

