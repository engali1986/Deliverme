# Deliverme - Ride Sharing App

## 📌 Project Overview
Deliverme is a **ride-sharing** application, developed using **React Native (Frontend)** and **Node.js with MongoDB (Backend)**. It allows **clients** to request rides and **drivers** to accept ride requests, including **document uploads** and **Google Drive integration**.

---

## 📂 Project Folder Structure
```
Deliverme/
├── deliverme-frontend/                    # React Native mobile app
│   ├── src/
│   │   ├── components/                    # Reusable UI components
│   │   ├── navigation/                    # Navigation setup
│   │   ├── screens/                       # All screens (Client/Driver Sign Up & Sign In)
│   │   │   ├── HomeScreen.js
│   │   │   ├── ClientSignupScreen.js
│   │   │   ├── ClientSigninScreen.js
│   │   │   ├── DriverSignupScreen.js
│   │   │   ├── DriverSigninScreen.js
│   │   ├── services/                      # API service functions
│   │   ├── context/                       # Context API for language toggle
│   ├── package.json                       # Frontend dependencies
│   └── README.md                          # Frontend-specific readme
│
├── deliverme-backend/                     # Node.js backend
│   ├── src/
│   │   ├── controllers/                   # Business logic (auth, ride requests)
│   │   │   ├── authController.mjs         # Authentication logic (OAuth2, Sign-In/Sign-Up)
│   │   ├── db/                            # MongoDB connection logic
│   │   │   └── connect.mjs                # Database connection with pooling
│   │   ├── middlewares/                   # Middleware for authentication, errors, uploads
│   │   │   ├── authMiddleware.mjs         # JWT authentication middleware
│   │   │   ├── uploadMiddleware.mjs       # Multer file upload middleware
│   │   ├── routes/                        # API routes
│   │   │   ├── authRoutes.mjs             # Auth-related routes (signup, signin)
│   │   │   ├── rideRoutes.mjs             # Ride booking & tracking routes
│   │   ├── utils/                         # Utility modules (e.g., logger)
│   │   │   ├── logger.mjs                 # Winston logger setup
│   │   ├── config/                        # Configuration files
│   │   │   ├── googleDriveConfig.mjs      # Google Drive OAuth2 setup
│   │   │   ├── emailConfig.mjs            # Nodemailer OAuth2 setup
│   │   ├── app.mjs                        # Express app setup
│   ├── logs/                              # Logs directory
│   ├── uploads/                           # Temporary storage for uploaded files
│   ├── .env                               # Environment variables (MongoDB, Google, Email, JWT)
│   ├── server.mjs                         # Backend entry point
│   ├── package.json                       # Backend dependencies
│   └── README.md                          # Backend-specific readme
│
└── README.md                              # Main project readme
```

---

## 🚀 Features
### **Frontend (React Native)**
✅ **Client & Driver Authentication** (Sign-Up, Sign-In).  
✅ **Google Drive API Integration** for **driver document uploads**.  
✅ **Instant Language Toggle** (English/Arabic).  
✅ **Navigation using React Navigation**.  

### **Backend (Node.js + Express + MongoDB)**
✅ **OAuth2 Authentication** for **Google Drive API & Nodemailer**.  
✅ **Google Drive API Integration** for **secure document storage**.  
✅ **Multer Middleware** for **handling file uploads**.  
✅ **Nodemailer OAuth2** for **secure email verification**.  
✅ **Error Handling & Logging** using **Winston**.  
✅ **JWT Authentication** for secure API access.  

---

## 🔧 Setup & Installation
### **1️⃣ Clone the Repository**
```sh
git clone https://github.com/your-repo/deliverme.git
cd deliverme
```

### **2️⃣ Install Dependencies**
```sh
# Install backend dependencies
cd deliverme-backend
npm install

# Install frontend dependencies
cd ../deliverme-frontend
npm install
```

### **3️⃣ Configure Environment Variables**
Create a `.env` file inside `deliverme-backend/` and add:
```plaintext
# MongoDB
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret_key

# OAuth2 Credentials (Google Drive & Nodemailer)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground

# Email Configuration (Gmail API)
EMAIL_USER=your_email@gmail.com
EMAIL_SERVICE=Gmail

# Google Drive Folder
DRIVE_PARENT_FOLDER_ID=your_google_drive_parent_folder_id
```

### **4️⃣ Start the Backend Server**
```sh
cd deliverme-backend
npm start
```

### **5️⃣ Start the React Native App**
For Android:
```sh
cd deliverme-frontend
npx react-native run-android
```
For iOS:
```sh
cd deliverme-frontend
npx react-native run-ios
```

---

## ✅ API Endpoints
### **Authentication**
| Method | Endpoint | Description |
|--------|-------------------------|--------------------------------|
| POST   | `/api/auth/client/signup`  | Client sign-up |
| POST   | `/api/auth/client/signin`  | Client sign-in |
| POST   | `/api/auth/driver/signup`  | Driver sign-up (with file uploads) |
| POST   | `/api/auth/driver/signin`  | Driver sign-in |

---

## 🌍 Deployment Guide
### **Frontend Deployment**
- Android: **Build APK** → `npx react-native run-android --variant=release`
- iOS: **Build iOS App** → `npx react-native run-ios --configuration Release`

### **Backend Deployment**
- Deploy on **Heroku / AWS / DigitalOcean**.
- Use **PM2** to keep the backend running:
```sh
npm install -g pm2
pm start
pm2 start server.mjs --name deliverme-backend
```

---

## 🚀 Next Steps
✅ **Implement Real-time Ride Tracking (Socket.IO)**  
✅ **Deploy Backend to Cloud Server (Heroku, AWS, DigitalOcean)**  
✅ **Deploy Frontend (APK & iOS)**  
✅ **Integrate Google Maps API for Ride Requests**  

---

💡 **Need Help?** Reach out for support or feature requests! 🚀

