# DeliverMe - Ride Sharing App

DeliverMe is a ride-sharing mobile application, built using **React Native** (frontend) and **Node.js with Express and MongoDB** (backend). The app supports **driver and client accounts**, allows users to **sign up, verify their email, request rides**, and integrates **Google Drive API for storing driver documents**.

---

## 🚀 Features

### **Client Features**
- ✅ Sign Up & Login (with Email Verification)
- ✅ Request a Ride (choose pickup: current location or map, choose destination from map, offer fare)
- ✅ Interactive Map (shows user location, custom marker with address, custom compass/North button)
- ✅ Multi-language Support (English & Arabic)
- ✅ Side Menu (completed rides, settings, language toggle, logout)
- ✅ Toast notifications for actions/errors

### **Driver Features**
- ✅ Sign Up with Required Documents (license, registration, criminal record, personal photo)
- ✅ Email Verification via Code
- ✅ Upload and manage documents (Google Drive integration)
- ✅ Login and access driver dashboard
- ✅ Side Menu and logout

### **Backend Features**
- ✅ REST API for authentication, ride requests, and document upload
- ✅ JWT-based authentication
- ✅ MongoDB for data storage
- ✅ Google Drive API for driver document storage
- ✅ Email verification for both clients and drivers
- ✅ Winston logging

---

## 📂 Project Structure

```
DeliverMe/
│── backend/
│   │── server.mjs
│   │── .env
│   │── DriveServiceAccount.json
│   │── Drafts/           # Screens and controllers (React Native code for reference, not used in backend runtime)
│   │── src/              # (API, controllers, services, etc.)
│
│── frontend/
│   │── App.js
│   │── app.json
│   │── index.js
│   │── src/
│   │   ├── screens/
│   │   │   ├── ClientHomeScreen.js
│   │   │   ├── DriverHomeScreen.js
│   │   │   ├── MapPickerScreen.js
│   │   │   ├── DriverSignupScreen.js
│   │   │   ├── DriverSigninScreen.js
│   │   │   ├── ClientSigninScreen.js
│   │   │   ├── ClientSignupScreen.js
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── i18n/
│   │   ├── navigation/
│   │   ├── services/
│   │   ├── utils/
│   │── assets/
│
│── README.md
│── package.json
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

