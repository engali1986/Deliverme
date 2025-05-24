import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import i18n from '../i18n/i18n';
const ClientSigninScreen = () => {
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const navigation = useNavigation();
  
    const handleSignIn = () => {
      // TODO: Add sign-in logic
      console.log(i18n.t('clientSignInSuccess'), mobile);
    };

  const initializeClientSignInScreen = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userType = await AsyncStorage.getItem("userType");
      console.log("ClientSigninScreen.js token, userType,:", token, userType);
      console.log("ClientSigninScreen.js type of token:", typeof token);

      if (token && userType) {
        console.log("ClientSigninScreen.js token, userType,:", token, userType);
        try {
          const decoded = jwtDecode(token);
          const now = Date.now() / 1000; // in seconds
          console.log("ClientSigninScreen.js decoded:", decoded);
          console.log("ClientSigninScreen.js now:", now);
          console.log("ClientSigninScreen.js decoded.exp:", decoded.exp);
          if (decoded.exp < now) {
            await AsyncStorage.clear();
          } else {
            navigation.replace(userType === "driver" ? "DriverHome" : "ClientHome");
          }
        } catch (e) {
          console.log("Invalid token");
          console.log(e);
          await AsyncStorage.clear();
        }
      } else {
        console.log("No token or userType found, staying on DriverSignin screen");
      }
    } catch (error) {
      console.error("Error during initialization:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      initializeClientSignInScreen();
    }, [])
  );
  
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{i18n.t('clientSignIn')}</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('mobile_number')}
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title={i18n.t('signIn')} onPress={handleSignIn} />
        <Button
          title={i18n.t('signUp')}
          onPress={() => navigation.navigate('ClientSignup')}
        />
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      fontSize: 24,
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
      marginBottom: 10,
      paddingHorizontal: 10,
    },
  });
  
  export default ClientSigninScreen;