import React,{useContext, useEffect} from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, Button, StyleSheet } from 'react-native';
import i18n from '../i18n/i18n.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { LanguageContext } from '../context/LanguageContext.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

export default function HomeScreen({ navigation }) {
  const { language } = useContext(LanguageContext); // Use context to trigger re-render
 
  useEffect(() => {
    const initializeHomeScreen = async () => {
      try {
       
        const token = await AsyncStorage.getItem("userToken");
        const userType = await AsyncStorage.getItem("userType");
        console.log("Home.js token, userType,:", token, userType);
        console.log("Home.js type of token:", typeof token);

        if (token && userType) {
          console.log("Home.js token, userType,:", token, userType);
          try {
            const decoded = jwtDecode(token);
            const now = Date.now() / 1000; // in seconds
            console.log("Home.js decoded:", decoded);
            console.log("Home.js now:", now);
            console.log("Home.js decoded.exp:", decoded.exp);
            if (decoded.exp < now) {
              await AsyncStorage.clear();
            } else {
              setInitialRoute(userType === "driver" ? navigation.navigate("DriverHome") : navigation.navigate("ClientHome"));
            }
          } catch (e) {
            console.log("Invalid token");
            console.log(e)
            await AsyncStorage.clear();
            
          }
        } else {
          console.log("No token or userType found, setting initial route to Home");
          
        }
      } catch (error) {
        console.error("Error during initialization:", error);
        
      } 
    };

    initializeHomeScreen();
  }, []); // Always call useEffect in the same order
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('home_title')}</Text>
      <LanguageToggle />
      <Button
        title={i18n.t('clientSignIn')}
        onPress={() => navigation.navigate('ClientSignin')}
      />
      <Button
        title={i18n.t('driverSignIn')}
        onPress={() => navigation.navigate('DriverSignin')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
