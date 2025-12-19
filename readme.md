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
│   ├── server.mjs
│   ├── .env
│   ├── DriveServiceAccount.json
│   ├── app.log
│   ├── package.json
│   ├── Drafts/                # React Native screen drafts and controller drafts
│   └── src/                   # Main backend source code (controllers, routes, etc.)
│
├── frontend/
│   ├── App.js
│   ├── app.json
│   ├── babel.config.js
│   ├── index.js
│   ├── .env
│   ├── assets/                # Images, icons, etc.
│   └── src/
│       ├── screens/           # ClientHomeScreen, DriverHomeScreen, etc.
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── i18n/
│       ├── navigation/
│       ├── services/          # API calls
│       └── utils/
│
├── node_modules/
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
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

#### 4. **Driver Document Upload Fails**
- **Symptom:** Driver cannot upload documents or verification fails.
- **Solution:**  
  - Check Google Drive API credentials in `backend/.env`.
  - Ensure the service account has access to the target Drive folder.
  - Review backend logs (`app.log`) for error details.

#### 5. **MongoDB Connection Issues**
- **Symptom:** Backend cannot connect to MongoDB.
- **Solution:**  
  - Verify `MONGO_URI` in `backend/.env`.
  - Ensure MongoDB is running and accessible from your backend server.
  - Check for network/firewall issues.

#### 6. **Environment Variables Not Loaded**
- **Symptom:** API keys or secrets are undefined in code.
- **Solution:**  
  - Make sure `.env` files exist and are correctly formatted (no extra quotes or spaces).
  - Restart your servers after editing `.env` files.
  - For React Native, ensure Babel is configured for environment variables.

#### 7. **Frontend/Backend Out of Sync**
- **Symptom:** API endpoints return 404 or unexpected errors.
- **Solution:**  
  - Make sure both frontend and backend are using the same API endpoint paths.
  - Update `API_BASE_URL` in frontend `.env` to match backend server address.

---

**If you encounter other issues, check the logs in `/backend/app.log` and use browser/Expo console for frontend errors. For further help, review the comments in the source files or contact the project maintainer.**

