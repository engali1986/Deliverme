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
│       │   ├── DriverHomeScreen.js # Driver home screen UI
│       ├── components/           # Reusable UI components
│       │   ├── LanguageToggle.js # Language toggle component
│       │   ├── LogViewer.js      # Log viewer component
│       ├── context/              # Context API for state management
│       │   ├── LanguageContext.js # Language context provider
│       ├── hooks/                # Custom React hooks
│       │   ├── usefonts.js       # Hook for loading fonts
│       ├── i18n/                 # Internationalization setup
│       │   ├── i18n.js           # i18n configuration
│       ├── navigation/           # Navigation setup
│       │   ├── AppNavigator.js   # App navigation structure
│       ├── services/             # API and background services
│       │   ├── api.js            # API service for backend communication
│       └── utils/                # Utility functions
│           ├── auth.js           # Authentication utilities
│           ├── localization.js   # Localization utilities
│
├── node_modules/                 # Dependencies
├── package.json                  # Project dependencies and scripts
├── package-lock.json             # Dependency lock file
├── .gitignore                    # Git ignore rules
└── README.md                     # Project documentation
```

---

## 🛠️ Installation & Setup

### Backend Setup
```sh
cd backend
npm install
npm run dev
```

### Frontend Setup
```sh
cd frontend
npm install
npx expo start
```

---

## 🔑 Environment Variables (`.env`)

```env
# Backend
MONGO_URI=mongodb+srv://your_mongo_url
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
GMAIL_USER=your_gmail
GMAIL_PASS=your_gmail_password
JWT_SECRET=your_jwt_secret
DRIVE_PARENT_FOLDER_ID=your_drive_folder_id

# Frontend
API_BASE_URL=http://your_backend_ip:5000/api
```

---

## 🎯 How It Works

1. **User Signs Up** → Enters details & gets a verification email.
2. **Driver Uploads Documents** → License, Registration, Personal Photo.
3. **Email Verification** → User enters the code to activate account.
4. **Client Requests a Ride** → Selects pickup/destination on map, offers fare.
5. **Driver Accepts Ride** → Ride starts, tracking enabled.

---

## 📱 UI/UX Highlights

- **MapPicker**: Custom bottom bar with instruction and North button (compass icon), custom marker with address.
- **Modals**: For selecting pickup, destination, and fare.
- **Language Toggle**: Instantly switch between English and Arabic.
- **Driver Document Upload**: Integrated with Google Drive.

---

## ✅ Current Progress

- [x] Client and driver authentication flows
- [x] Ride request form with map-based location picking
- [x] Custom map marker with address and icon
- [x] Modal for selecting pickup/destination/fare
- [x] MapPicker with custom compass button beside instructions
- [x] Driver document upload and verification
- [x] Multi-language UI (English/Arabic)
- [x] Toast notifications
- [x] Side menu with logout and settings
- [x] Backend API for rides and authentication

---

## 🚧 Next Steps & Future Improvements

- [ ] Real-time ride status updates (WebSocket or polling)
- [ ] Driver-side ride acceptance and navigation

---

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### 1. **Backend Not Reachable**
- **Symptom:** The app shows a spinner or network error when trying to sign in or request a ride.
- **Solution:**  
  - Ensure the backend server is running (`npm run dev` in `/backend`).
  - Check your `.env` files for correct `API_BASE_URL` and `MONGO_URI`.
  - Make sure your backend port (default: 5000) is not blocked by a firewall.

#### 2. **Google Maps Not Displaying**
- **Symptom:** The map does not load or shows a blank screen.
- **Solution:**  
  - Verify your Google Maps API key in `frontend/.env`.
  - Ensure billing is enabled for your Google Cloud project.
  - Check for typos in the API key or missing permissions.

#### 3. **Expo Location Permissions**
- **Symptom:** Location is not detected or permission denied.
- **Solution:**  
  - Make sure you request location permissions in your code.
  - On Android, check device settings for location permissions.
  - On iOS, ensure location permissions are enabled for the app.
# DeliverMe — Ride Sharing App (Updated)

DeliverMe is a mobile ride-hailing project with a React Native frontend and a Node.js backend using MongoDB. This README was updated to reflect the repository's current state (excluding files in the `Drafts` folder).

---

## Key Features (Current)

- **Authentication**: JWT-based sign up / sign in flows for both Clients and Drivers, including email verification.
- **Driver Document Upload**: Drivers can upload required documents (license, registration, criminal record, personal photo). Files are integrated with Google Drive via a service account.
- **Map-Based Ride Requests**: Clients pick pickup and destination using an interactive map.
- **Background Location Tracking**: Driver location tracking service is available in the frontend for background updates.
- **Real-time Updates**: Socket.IO integration in backend and frontend enables real-time ride messages and driver notifications.
- **Internationalization**: English / Arabic UI support with a language toggle.
- **Toast & UX Helpers**: Toast notifications and a side menu for navigation, settings, and logout.
- **Logging**: Winston-style logger utilities exist in the backend for structured logs.

---

## Project Layout (high-level)

- Backend: [backend](backend)
  - Entry: `server.mjs` / `src/app.mjs`
  - API routes: `src/routes/*`
  - Auth: `src/controllers/authController.mjs`
  - DB: `src/db/connect.mjs`
  - Socket code: `src/socket/*` (Socket.IO handlers)
  - Middleware: `src/middlewares/*`

- Frontend: [frontend](frontend)
  - Entry: `App.js`, `index.js`
  - Screens: `src/screens/*` (Client and Driver screens)
  - Services: `src/services/api.js`, `src/services/backgroundLocationService.js`, `src/services/DriverSocket.js`
  - Components / i18n / hooks: `src/components`, `src/i18n`, `src/hooks`

Note: The `Drafts` folder contains experimental and copy files — those were excluded from this summary.

---

## Installation & Quick Start

Backend (from project root):
```powershell
cd backend
npm install
npm run dev
```

Frontend (from project root):
```powershell
cd frontend
npm install
npx expo start
```

Environment files:
- Backend: create `backend/.env` with `MONGO_URI`, `JWT_SECRET`, Gmail/Google Drive credentials, and `DRIVE_PARENT_FOLDER_ID`.
- Frontend: create `frontend/.env` with `API_BASE_URL` pointing to your backend (example: `http://<host>:5000/api`).

---

## Current Progress / Status

- Authentication: implemented ✅
- Email verification: implemented ✅
- Driver document upload (Google Drive): implemented ✅
- Map / Ride request flow: implemented ✅
- Background location: implemented ✅
- Real-time socket updates: implemented ✅
- Multi-language (EN/AR): implemented ✅
- Logging and basic middleware: implemented ✅

Remaining / In progress
- Driver-side navigation guidance (turn-by-turn) — not yet integrated
- End-to-end automated tests — not present

---

## Troubleshooting (common issues)

- Backend unreachable: ensure `backend` server is running (`npm run dev`) and `MONGO_URI` is correct.
- Expo / Maps: confirm your Google Maps API key and billing settings.
- Location permissions: ensure the app requests and is granted location permissions on device/emulator.
- Google Drive uploads: verify `DriveServiceAccount.json` and that the service account has access to the destination folder.

If you see errors, check backend logs and the Expo / browser console for useful traces.

---

## Next Recommended Actions

1. Add or enable end-to-end and unit tests for core backend endpoints and critical frontend flows.
2. Verify and harden production env variables and secrets handling (avoid committing credentials).
3. Implement driver navigation (turn-by-turn) if required, and add more robust error handling around socket reconnection and background location failures.

---

If you want, I can:
- run the app locally and fix immediate runtime errors,
- add an example `.env.example` for both frontend and backend,
- or open a PR with the README changes and a short CHANGELOG entry.

**Updated file:** [readme.md](readme.md)

