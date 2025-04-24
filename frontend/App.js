import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator.js';
import { initializeLanguage } from './src/i18n/i18n.js';
import { LanguageProvider } from './src/context/LanguageContext.js';
import './src/i18n/i18n.js';
import Toast from "react-native-toast-message";
import { toastConfig } from './src/components/toastConfig.js';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

export default function App() {
  const [loading, setLoading] = useState(true); // Always call useState at the top
  const [initialRoute, setInitialRoute] = useState(null); // State to hold the initial route

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeLanguage(); // Load language settings
        const demotoken= "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MGEzMTg5ODgzMDA2ZDUyYWFkYzE0NyIsIm1vYmlsZSI6IjAxMTAxODA2NTIyIiwibmFtZSI6IkFsaSIsImlhdCI6MTc0NTUwMjQxNywiZXhwIjoxNzQ1NTAyNTM3fQ.7ygwr8BLmVibC286gwrn94A9UNoNWlLwmflczEuKH-0"
      const demodecoded = jwtDecode(demotoken);
      console.log("App.js demodecoded:", demodecoded);

        const token = await AsyncStorage.getItem("userToken");
        const userType = await AsyncStorage.getItem("userType");
        console.log("App.js token, userType,:", token, userType);
        console.log("App.js type of token:", typeof token);

        if (token && userType) {
          console.log("App.js token, userType,:", token, userType);
          try {
            const decoded = jwtDecode(token);
            const now = Date.now() / 1000; // in seconds
            console.log("App.js decoded:", decoded);
            console.log("App.js now:", now);
            console.log("App.js decoded.exp:", decoded.exp);
            if (decoded.exp < now) {
              await AsyncStorage.clear();
              setInitialRoute("Home");
            } else {
              setInitialRoute(userType === "driver" ? "DriverHome" : "ClientHome");
            }
          } catch (e) {
            console.log("Invalid token");
            console.log(e)
            await AsyncStorage.clear();
            setInitialRoute("Home");
          }
        } else {
          console.log("No token or userType found, setting initial route to Home");
          setInitialRoute("Home");
        }
      } catch (error) {
        console.error("Error during initialization:", error);
        setInitialRoute("Home");
      } finally {
        setLoading(false); // Ensure loading is set to false after everything
      }
    };

    initializeApp();
  }, []); // Always call useEffect in the same order

  // Conditional rendering happens here, not before hooks
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }
  console.log("App.js initialRoute:", initialRoute)

  if (!initialRoute) {
    console.log("Initial route is not set yet.");
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#004080" />
      </View>
    );
  }

  return (
    <>
    <LanguageProvider>
      <AppNavigator initialRouteName={initialRoute} />
    </LanguageProvider>
    <Toast config={toastConfig} position="top" topOffset={50} />
    </>
  );
}

 
// Styles for the loading screen
// This is a simple loading screen with a spinner in the center

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
