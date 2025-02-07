# DeliverMe - Ride Sharing App

## Overview
DeliverMe is a ride-sharing mobile application built with React Native (Expo) for the frontend and Node.js (Express) with MongoDB for the backend. The app allows clients to request rides from nearby drivers, while drivers can register, upload verification documents, and accept ride requests.

## Features
### Client Features:
- Sign up and sign in.
- Request a ride.
- See available drivers on the map.
- Multi-language support (English & Arabic).

### Driver Features:
- Sign up and sign in.
- Upload verification documents (License, Registration, Criminal Record, Personal Photo).
- Receive ride requests from clients.
- Email verification for secure onboarding.

### Admin Features:
- View registered drivers and clients.
- Approve or reject driver registrations.
- Monitor ride transactions.

## Project Folder Structure
```
DeliverMe/
│── backend/                     # Backend (Node.js + Express + MongoDB)
│   │── controllers/
│   │   │── authController.mjs    # Authentication logic (client & driver signup, login, verification)
│   │── middlewares/
│   │   │── uploadMiddleware.mjs  # Handles file uploads for drivers
│   │── routes/
│   │   │── authRoutes.mjs        # API routes for authentication
│   │── utils/
│   │   │── logger.mjs            # Winston logging for debugging
│   │── config/
│   │   │── connect.mjs           # MongoDB connection logic
│   │── server.mjs                # Express server setup
│── frontend/                     # Frontend (React Native + Expo)
│   │── src/
│   │   │── screens/
│   │   │   │── HomeScreen.js      # Client & Driver selection screen
│   │   │   │── ClientSigninScreen.js  # Client login
│   │   │   │── ClientSignupScreen.js  # Client registration
│   │   │   │── DriverSigninScreen.js  # Driver login
│   │   │   │── DriverSignupScreen.js  # Driver registration + verification
│   │   │   │── DriverHomeScreen.js    # Driver dashboard
│   │   │── navigation/
│   │   │   │── AppNavigator.js   # App navigation setup
│   │   │── services/
│   │   │   │── api.js            # API calls to backend
│   │   │── i18n/
│   │   │   │── index.js          # Multi-language (English & Arabic) support
│   │   │── App.js                # Main application entry point
│── README.md                      # Project documentation
│── package.json                    # Dependencies and scripts
│── .env                             # Environment variables
```

## Setup Instructions
### 1. Backend Setup
```sh
cd backend
npm install
npm start
```

### 2. Frontend Setup
```sh
cd frontend
npm install
npx expo start
```

## API Endpoints
### Authentication
- `POST /api/auth/client/signup` - Client Signup
- `POST /api/auth/client/signin` - Client Login
- `POST /api/auth/driver/signup` - Driver Signup
- `POST /api/auth/driver/verify` - Driver Email Verification
- `POST /api/auth/driver/signin` - Driver Login

## Technologies Used
- **Frontend:** React Native (Expo), React Navigation, Context API, i18next (Localization)
- **Backend:** Node.js, Express.js, MongoDB (Native Driver), Google Drive API (for document uploads)
- **Other Tools:** Winston (Logging), Multer (File Uploads), Nodemailer (Email Verification)

## Contributors
- Noor (Lead Developer)

## Future Improvements
- Implement ride tracking in real-time using Google Maps API.
- Add payment gateway integration.
- Improve UI/UX with animations and better design elements.

## License
This project is licensed under the MIT License.

