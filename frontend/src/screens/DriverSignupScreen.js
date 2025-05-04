import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Button, TouchableOpacity, ActivityIndicator, Image, Alert, StyleSheet, ScrollView } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import i18n from '../i18n/i18n.js';
import {driverSignup, verifyDriver} from "../services/api.js"
import Toast from 'react-native-toast-message';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

const DriverSignupScreen = () => {
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState("");
  const navigation = useNavigation();

  
  // State to store form input values
  const [form, setForm] = useState({
    email: "",
    mobile: "",
    name: "",
    password: "",
    license: null,
    registration: null,
    criminal: null,
    personal: null,
  });
  
  // Loading state to indicate form submission progress
  const [loading, setLoading] = useState(false);
  // Function to handle input validation and form state update
  const validateInputs = () => {
      // Check if all fields are filled
      if (!form.email || !form.mobile || !form.name || !form.password || !form.license || !form.registration || !form.criminal || !form.personal) {
        console.log("ValidateInputs function, missing fields")
        // Alert.alert'Error', 'All fields are mandatory!';
        Toast.show({
          type: 'error', // or 'error'
          text1: 'Error',
          text2:i18n.t("missing_fields"),
          props: { showIcon: true }, // Custom Prop for Icon
        });
        return false;
      }
  
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        // Alert.alert'Error', 'Please enter a valid email address!';
        Toast.show({
          type: 'error', // or 'error'
          text1: 'Error',
          text2:'Please enter a valid email address!',
          props: { showIcon: true }, // Custom Prop for Icon
        });
        return false;
      }
  
      // Validate password (at least 8 characters, 1 uppercase, 1 lowercase, 1 special character)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
      if (!passwordRegex.test(form.password)) {
        // Alert.alert(
        //   'Error',
        //   'Password must be at least 8 characters long, with at least 1 uppercase letter, 1 lowercase letter, and 1 special character!'
        // );
        Toast.show({
          type: 'error', // or 'error'
          text1: 'Error',
          text2:'Password must be at least 8 characters long, with at least 1 uppercase letter, 1 lowercase letter, and 1 special character!',
          props: { showIcon: true }, // Custom Prop for Icon
        });
        return false;
      }
  
      // Validate mobile number (numeric and 11 digits for Egypt)
      if (!/^\d{11}$/.test(form.mobile)) {
        // Alert.alert'Error', 'Mobile number must be 11 digits!';
        Toast.show({
          type: 'error', // or 'error'
          text1: 'Error',
          text2:'Mobile number must be 11 digits!',
          props: { showIcon: true }, // Custom Prop for Icon
        });
        
        return false;
      }
  
      return true;
    };

 

  // Function to handle file upload using DocumentPicker
  // This function allows the user to select an image file from their device
  const pickImage = async (field) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
      });

      if (!result.canceled && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        const fileInfo = await FileSystem.getInfoAsync(imageUri);
        if (fileInfo.size > 1024 * 1024) {
          // Alert.alert("File too large", "File size must be under 1MB");
          Toast.show({
            type: 'error', // or 'error'
            text1: 'File too large.',
            text2:'File size must be under 1MB',
            props: { showIcon: true }, // Custom Prop for Icon
          });
          return;
        }
    
        setForm((prev) => ({ ...prev, [field]: imageUri }));
      }


    } catch (error) {
      // Alert.alert("File upload error", error);
      Toast.show({
        type: 'error', // or 'error'
        text1: 'File upload error',
        text2:error,
        props: { showIcon: true }, // Custom Prop for Icon
      });
      
    }
  };
  
  // Function to handle signup request
  const handleSignup = async () => {
    console.log("form",form)
    // Check if all required fields are filled
    if (!validateInputs()){
          console.log("Please fill all data")
          return;
        }

    setLoading(true);

   
     try {
  const response = await driverSignup(form).then(res=>{
    console.log("Driver signup response",res)
    return res
  }); // Call the API function
  console.log("Driver signup response", response)
  console.log("Driver signup response", response.message)
  if(response.message==="Driver already exists, an email with verification code sent to your email" || response.message==="Driver registered successfully. Please verify your email.") {
    setShowVerification(true)
  Toast.show({
    type: 'success', 
    text1: 'Success.',
    text2:response.message||'Signup successful! Please check your email to verify your account.',
    props: { showIcon: true }, // Custom Prop for Icon
  });
  }else if(response.message==="Driver already verified"){
    Toast.show({
      type: 'success', // or 'error'
      text1: 'Success.',
      text2: 'Driver already verified, please login!',
      props: { showIcon: true }, // Custom Prop for Icon
    });

    setLoading(false)
    return;
  }

  // navigation.replace("DriverSignin");
     } catch (error) {
      console.log(error)
  setLoading(false);
  Toast.show({
    type: 'error', // or 'error'
    text1: 'Error.',
    text2:error.message||"Signup failed. Please try again.",
    props: { showIcon: true }, // Custom Prop for Icon
  });
  console.error(error);
     } finally {
  setLoading(false);
     }
  };

  // Function to handle verification
  const handleVerify = async () => {
    setLoading(true)
    try {
      const response = await verifyDriver({ mobile:form.mobile, verificationCode });
      console.log("DriverSignUpScreen.js handleVerify response", response)
      console.log("DriverSignUpScreen.js handleVerify response", response.message)
      if (response.message==="Wrong verification code, please check your email") {
        Toast.show({ type: "error", text1: "Verification Failed", text2: response.message });
        setLoading(false)
        return
        
      }
      
      Toast.show({ type: "success", text1: "Verification Successful", text2: "You can now sign in." });
      await AsyncStorage.clear()
      await AsyncStorage.setItem("userToken", response.token);
      await AsyncStorage.setItem("userType", "driver");
      await AsyncStorage.setItem("userData", JSON.stringify(response.driver));
      setLoading(false)
      navigation.replace("DriverHome"); // Redirect to home
    } catch (error) {
      Toast.show({ type: "error", text1: "Verification Failed", text2: error.message });
      setLoading(false)
    }
  };

  const initializeDriverSignUpScreen = async () => {
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
            navigation.replace(userType === "driver" ? "DriverHome" : "ClientHome");
          }
        } catch (e) {
          console.log("Invalid token");
          console.log(e);
          await AsyncStorage.clear();
        }
      } else {
        console.log("No token or userType found, staying on Home screen");
      }
    } catch (error) {
      console.error("Error during initialization:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      initializeDriverSignUpScreen();
    }, [])
  );

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        {!showVerification?(<>
          <Text style={styles.title}>{i18n.t("sign_up")}</Text>
      
      {/* Input fields for email, mobile, name, and password */}
      <TextInput style={styles.input} placeholder={i18n.t("email")} value={form.email} onChangeText={(text)=>{setForm({...form,email:text})}} />
      <TextInput style={styles.input} placeholder={i18n.t("mobile_number")} value={form.mobile} onChangeText={(text)=>{setForm({...form,mobile:text})}} />
      <TextInput style={styles.input} placeholder={i18n.t("name")} value={form.name} onChangeText={(text)=>{setForm({...form,name:text})}} />
      <TextInput style={styles.input} placeholder={i18n.t("password")} secureTextEntry value={form.password} onChangeText={(text)=>{setForm({...form,password:text})}} />
      
      {/* File upload buttons for driver documents */}
      {["license", "registration", "criminal", "personal"].map((field) => (
        <TouchableOpacity style={styles.uploadButton} key={field} onPress={() => pickImage(field)}>
          <Text>{i18n.t(`${field}`)}</Text>
          {form[field] && <Image source={{ uri: form[field] }} style={styles.image} />}
        </TouchableOpacity>
      ))}

      {/* Submit button with loading indicator */}
      {loading ? <ActivityIndicator size="large" /> : <Button title={i18n.t("sign_up")} onPress={handleSignup} />}
        </>):(<>
          <Text style={styles.title}>Enter Verification Code</Text>
      <TextInput style={styles.input} placeholder={i18n.t("verification_code")} keyboardType="numeric" value={verificationCode} onChangeText={setVerificationCode} />
      {loading ? <ActivityIndicator size="large" /> :<Button title={i18n.t("verify")} color="#acc6f5" onPress={handleVerify}  />}
        </>)}

      
      
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    marginBottom: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  uploadButton: {
  backgroundColor: "#acc6f5",
  padding: 10,
  marginVertical: 5,
  borderRadius: 8,
  },
  uploadText: {
  color: "#ffffff",
  textAlign: "center",
  },
  image: {
  width: 100,
  height: 100,
  alignSelf: "center",
  marginTop: 5,
  },
  });

export default DriverSignupScreen;

