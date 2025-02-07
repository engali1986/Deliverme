# DeliverMe - Ride Sharing App

DeliverMe is a ride-sharing mobile application, built using **React Native** (frontend) and **Node.js with Express and MongoDB** (backend). The app supports **driver and client accounts**, allows users to **sign up, verify their email, request rides**, and integrates **Google Drive API for storing driver documents**.

---

## 🚀 Features
### **1. Client Features:**
✅ Sign Up & Login (Email Verification Required)
✅ Request a Ride
✅ View Nearby Drivers
✅ Multi-language Support (English & Arabic)

### **2. Driver Features:**
✅ Sign Up with Required Documents
✅ Email Verification via Code
✅ Upload License, Car Registration, and Personal Documents
✅ Accept Ride Requests

### **3. Admin Features:**
✅ View & Manage Clients & Drivers
✅ Monitor Ride Requests
✅ Manage Google Drive Uploads

### **4. Technologies Used:**
- **Frontend:** React Native, Expo, React Navigation
- **Backend:** Node.js, Express, MongoDB (Native Driver)
- **Storage:** Google Drive API (for driver documents)
- **Email:** Nodemailer with OAuth2
- **Authentication:** JWT-based authentication
- **Logging:** Winston Logger

---

## 📂 Project Folder Structure
```
DeliverMe/
│── backend/                   # Node.js & Express Backend
│   │── controllers/           # API Controllers
│   │   ├── authController.mjs # Handles authentication (Signup, Login, Verification)
│   │── middlewares/           # Express Middlewares
│   │   ├── uploadMiddleware.mjs  # Multer for file uploads
│   │── routes/                # API Routes
│   │   ├── authRoutes.mjs     # Authentication Routes
│   │── services/              # Utility & External Services
│   │   ├── googleDrive.mjs    # Google Drive Integration
│   │── utils/                 # Logger, Configs
│   │── server.mjs             # Express Server Entry Point
│   │── config.mjs             # Environment Variables
│
│── frontend/                  # React Native App
│   │── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.js         # Main Home Screen
│   │   │   ├── ClientSigninScreen.js # Client Login
│   │   │   ├── ClientSignupScreen.js # Client Signup
│   │   │   ├── DriverSigninScreen.js # Driver Login
│   │   │   ├── DriverSignupScreen.js # Driver Signup with Verification Code
│   │   │   ├── DriverHomeScreen.js   # Driver Dashboard
│   │   │   ├── VerifyDriverScreen.js # Verification Code Entry
│   │   ├── navigation/
│   │   │   ├── AppNavigator.js       # Navigation Setup
│   │   ├── services/
│   │   │   ├── api.js                # API Calls (Signup, Login, Verification)
│   │   ├── assets/
│   │   ├── App.js
│   │   ├── i18n.js                    # Language Setup
│   │   ├── styles/
│   │   │   ├── theme.js               # App Theme (Shades of Blue)
│
│── README.md                   # Project Documentation
│── .env                         # Environment Variables
│── package.json                 # Dependencies & Scripts
```

---

## 🛠️ Installation & Setup

### **Backend Setup**
```sh
cd backend
npm install
npm start
```

### **Frontend Setup**
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
1️⃣ **User Signs Up** → Enters details & gets a verification email.
2️⃣ **Driver Uploads Documents** → License, Registration, Personal Photo.
3️⃣ **Email Verification** → User enters the code to activate account.
4️⃣ **Client Requests a Ride** → Nearby drivers get notified.
5️⃣ **Driver Accepts Ride** → Ride starts, tracking enabled.

---

## ✅ Next Steps & Future Improvements
- **Real-time Ride Tracking** (Socket.io)
- **In-App Payments Integration** (Stripe)
- **Push Notifications** for Ride Requests

🚀 **DeliverMe is now ready to deploy!** 🎉

