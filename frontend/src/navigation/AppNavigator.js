import React, {useEffect, useRef} from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import ClientSigninScreen from '../screens/ClientSigninScreen';
import DriverSigninScreen from '../screens/DriverSigninScreen';
import ClientSignupScreen from '../screens/ClientSignupScreen';
import DriverSignupScreen from '../screens/DriverSignupScreen';
import DriverHomeScreen from '../screens/DriverHomeScreen';
import ClientHomeScreen from '../screens/ClientHomeScreen';
import MapPickerScreen from '../screens/MapPickerScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppEvents, { EVENTS } from '../utils/AppEvents';
import Toast from 'react-native-toast-message';



const Stack = createStackNavigator();

export default function AppNavigator({ initialRouteName }) {
  console.log("AppNavigator.js initialRouteName:", initialRouteName);
  console.log(AsyncStorage.getItem("userToken"));
  console.log(AsyncStorage.getItem("userType"));
  console.log(AsyncStorage.getItem("userData"));
  const navigationRef = useRef(null);
  useEffect(() => {
  AppEvents.on(EVENTS.SESSION_EXPIRED, () => {
    Toast.show({
      type: "error",
      text1: "Session expired",
      text2: "Please login again",
    });

    navigationRef.current?.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  });

  return () => {
    AppEvents.off(EVENTS.SESSION_EXPIRED);
  };
}, []);
  return (
    <NavigationContainer ref={navigationRef}>
       
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }} // Move here
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ClientSignin" component={ClientSigninScreen} />
        <Stack.Screen name="DriverSignin" component={DriverSigninScreen} />
        <Stack.Screen name="ClientSignup" component={ClientSignupScreen} />
        <Stack.Screen name="DriverSignup" component={DriverSignupScreen} />
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
        <Stack.Screen name="ClientHome" component={ClientHomeScreen} />
        <Stack.Screen name="MapPicker" component={MapPickerScreen} options={{ title: 'Select Location' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
