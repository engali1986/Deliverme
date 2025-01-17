# Deliverme App Progress Overview

Deliverme is a mobile application designed to function as a ride-hailing platform, with features for both **Clients** and **Drivers**. The project consists of a **React Native frontend** and a **Node.js backend** using the **native MongoDB driver**.

------

## **Features Implemented So Far**

### **Frontend (React Native)**
1. **Screens**:
   - **Home Screen**:
     - Provides options for **Client Sign-In** and **Driver Sign-In**.
     - Includes a language toggle for English and Arabic.
   - **Client Sign-Up Screen**:
     - Allows clients to register with email, mobile number, name, and password.
     - Validates password strength and ensures all fields are mandatory.
   - **Driver Sign-Up Screen**:
     - Allows drivers to register with email, mobile number, name, password, and document uploads (driver license, car registration, etc.).
   - **Client Sign-In Screen**:
     - Allows clients to log in using their email and password.
   - **Driver Sign-In Screen**:
     - Allows drivers to log in using their email and password.

2. **Localization**:
   - Supports English and Arabic with instant language toggling.

3. **Theming**:
   - Shades of blue are used as the primary color scheme.

4. **Navigation**:
   - Implemented using React Navigation to handle screen transitions seamlessly.

---

### **Backend (Node.js + Express)**
1. **Features**:
   - **Client Authentication**:
     - API endpoints for client sign-up and sign-in.
   - **Driver Authentication**:
     - API endpoints for driver sign-up and sign-in.
   - **Password Hashing**:
     - Secure password storage using `bcryptjs`.
   - **JWT Authentication**:
     - Tokens issued upon successful login.
   - **File Uploads**:
     - Driver documents (e.g., license, car registration) can be uploaded.

2. **Database**:
   - Used **MongoDB** with native driver for optimized performance.
   - Connection pooling for scalability.

3. **Logging**:
   - Integrated **Winston** for logging application events and errors.
   - Logs are saved to both the console and a `logs/app.log` file.

4. **Error Handling**:
   - Centralized error handling middleware ensures consistent error responses.

---

## **Folder Structure**

```
Deliverme/
├── deliverme-frontend/                    # React Native mobile app
│   ├── assets/                            # Static assets (images, fonts, etc.)
│   ├── src/
│   │   ├── components/                    # Reusable UI components
│   │   ├── navigation/                    # Navigation setup
│   │   ├── screens/                       # All screens (Client/Driver Sign Up & Sign In)
│   │   ├── services/                      # Services (API calls)
│   │   ├── context/                       # Context API for language toggle
│   │   └── App.js                         # Main app entry point
│   ├── .babel.config.js                   # Babel configuration
│   ├── package.json                       # React Native dependencies
│   └── README.md                          # Frontend-specific readme
│
├── deliverme-backend/                     # Node.js backend
│   ├── src/
│   │   ├── controllers/                   # Handles business logic
│   │   │   └── authController.mjs
│   │   ├── db/                            # Database connection logic
│   │   │   └── connect.mjs
│   │   ├── middlewares/                   # Custom middlewares (auth, error handling)
│   │   │   ├── authMiddleware.mjs
│   │   │   └── errorHandler.mjs
│   │   ├── routes/                        # API routes
│   │   │   └── authRoutes.mjs
│   │   ├── utils/                         # Utility modules (e.g., logger)
│   │   │   └── logger.mjs
│   │   └── app.mjs                        # Express app setup
│   ├── .env                               # Environment variables
│   ├── server.mjs                         # Entry point for the backend server
│   ├── package.json                       # Backend dependencies
│   └── package-lock.json                  # Automatically generated dependency tree
└── README.md                              # Main project readme (overview of entire project)
```

---

## **Next Steps**

### **Frontend**
1. Integrate backend API endpoints for:
   - Client and driver authentication.
   - Ride requests and real-time updates.
2. Implement Google Maps integration for:
   - Displaying client and driver locations.
   - Routing and navigation.
3. Add push notifications for ride status updates.

### **Backend**
1. Implement ride-related features:
   - API endpoints for ride requests.
   - Real-time ride updates using **Socket.IO**.
2. Enhance security:
   - Use `helmet` for securing HTTP headers.
   - Rate limiting to prevent abuse of API endpoints.
3. Add file storage integration for driver document uploads:
   - Use **Cloudinary** or **AWS S3**.

### **Deployment**
1. Deploy the backend using **Heroku** or **AWS**.
2. Build and release the mobile app:
   - Android: Generate APK/AAB and publish to **Google Play Store**.
   - iOS: Use **Xcode** to build and publish to **Apple App Store**.

---

## **How to Run the App**

### **Backend**
1. Navigate to the backend folder:
   ```bash
   cd deliverme-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   npm run dev
   ```

### **Frontend**
1. Navigate to the frontend folder:
   ```bash
   cd deliverme-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend in development mode:
   ```bash
   npx expo start
   ```

---

## **Contact**
For any questions or suggestions, please contact [your email].

