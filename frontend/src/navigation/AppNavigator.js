import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import ClientSigninScreen from '../screens/ClientSigninScreen';
import DriverSigninScreen from '../screens/DriverSigninScreen';
import ClientSignupScreen from '../screens/ClientSignupScreen';
import DriverSignupScreen from '../screens/DriverSignupScreen';


const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{headerTitleAlign:'center', headerTintColor:"red"}}>
        <Stack.Screen name="Home" component={HomeScreen}/>
        <Stack.Screen name="ClientSignin" component={ClientSigninScreen} />
        <Stack.Screen name="DriverSignin" component={DriverSigninScreen} />
        <Stack.Screen name="ClientSignup" component={ClientSignupScreen} />
        <Stack.Screen name="DriverSignup" component={DriverSignupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
