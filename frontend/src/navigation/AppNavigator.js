import React from 'react';
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



const Stack = createStackNavigator();

export default function AppNavigator({ initialRouteName }) {
  console.log("AppNavigator.js initialRouteName:", initialRouteName);
  console.log(AsyncStorage.getItem("userToken"));
  console.log(AsyncStorage.getItem("userType"));
  console.log(AsyncStorage.getItem("userData"));
  return (
    <NavigationContainer>
       
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
