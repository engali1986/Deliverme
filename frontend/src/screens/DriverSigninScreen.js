import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import i18n from '../i18n/i18n';
import {driverSignin, verifyDriver} from "../services/api.js"
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from 'react-native-toast-message';
import jwtDecode from 'jwt-decode';


const DriverSigninScreen = () => {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [email,setEmail]=useState("")
  const [ShowVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const navigation = useNavigation();
  // Loading state to indicate form submission progress
  const [loading, setLoading] = useState(false);
  
  const handleSignIn = async () => {
    setLoading(true)
    if (mobile.length===0 || password.length===0) {
      Toast.show({ type: "error", text1: "Error",text2:i18n.t("missing_fields"),props: { showIcon: true } });
      setLoading(false)
      return
    }
    try {
      console.log("DriverSigninScreen.js mobile, password:", mobile, password)
      const response = await driverSignin({ mobile, password });
      if (response.driverVerified) {
        Toast.show({ type: "success", text1: "Sign-In Successful", text2: "Welcome back!",props: { showIcon: true } });
        await AsyncStorage.setItem("userToken", response.token);
        await AsyncStorage.setItem("userType", "driver");
        await AsyncStorage.setItem("userData", JSON.stringify(response.driver));
        setLoading(false)
        navigation.navigate("DriverHome"); // Redirect to home
      }
      if (!response.driverVerified) {
        setShowVerification(true);
        Toast.show({ type: "success", text1: "Verification Required", text2: "Please verify your account first.", props: { showIcon: true }  });
        setLoading(false)
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Sign-In Failed", text2: error.message, props: { showIcon: true }  });
      setLoading(false)
    }
  };

  const handleVerify = async () => {
    setLoading(true)
    try {
      const response = await verifyDriver({ mobile:mobile, verificationCode });
      console.log("DriverSigninScreen.js handleVerify response", response)
      console.log("DriverSigninScreen.js handleVerify response", response.message)
      if (response.message==="Wrong verification code, please check your email") {
        Toast.show({ type: "error", text1: "Verification Failed", text2: response.message });
        setLoading(false)
        return
        
      }
      
      Toast.show({ type: "success", text1: "Verification Successful", text2: "You can now sign in." });
      await AsyncStorage.setItem("userToken", response.token);
      await AsyncStorage.setItem("userType", "driver");
      await AsyncStorage.setItem("userData", JSON.stringify(response.driver));
      setLoading(false)
      navigation.navigate("DriverHome"); // Redirect to home
    } catch (error) {
      Toast.show({ type: "error", text1: "Verification Failed", text2: error.message });
      setLoading(false)
    }
  };

  useEffect(() => {
    const checkDriverToken = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        try {
          const decoded = jwtDecode(token);
          console.log("DriverSigninScreen.js checkDriverToken decoded", decoded)
          const now = Date.now() / 1000;
          if (decoded.exp > now) {
            navigation.replace("DriverHome");
          } else {
            await AsyncStorage.clear(); // Clear all AsyncStorage data
          }
        } catch (error) {
          console.error("Invalid token:", error);
          await AsyncStorage.clear(); // Clear all AsyncStorage data
        }
      }
    };
    checkDriverToken();
  }, []);
  
    return (
    <View style={styles.container}>
       {!ShowVerification?(
        <>
        <Text style={styles.title}>{i18n.t('driverSignIn')}</Text>
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
        {loading ? <ActivityIndicator size="large" />:<Button title={i18n.t('signIn')} onPress={handleSignIn} />}
        <Button
          title={i18n.t('signUp')}
          onPress={() => navigation.navigate('DriverSignup')}
        />
        </>
      ):(<>
      <Text style={styles.title}>{i18n.t('verify_account')}</Text>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('verification_code')}
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
          />
          {loading ? <ActivityIndicator size="large" />:<Button title={i18n.t('verify')} onPress={handleVerify} />}
          
      </>)}

    </View>
    )
     
      
    
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
  
  export default DriverSigninScreen;