import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Button, TouchableOpacity, ActivityIndicator, Image, Alert, StyleSheet, ScrollView } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import i18n from '../i18n/i18n.js';
import {clientSignup, verifyClient} from "../services/api.js"
import Toast from 'react-native-toast-message';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

export default function ClientSignupScreen() {
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
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState("");
  const navigation = useNavigation();
  // Loading state to indicate form submission progress
    const [loading, setLoading] = useState(false);

  const validateInputs = () => {
    // Check if all fields are filled
    if (!form.email || !form.name || !form.password || !form.mobile) {
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

  const handleSignup = async () => {
    if (!validateInputs()){
      console.log("Please fill all data")
      return;
    }

     // Disable the button
     setLoading(true);

    try {
      
      const response = await clientSignup(form)
      console.log("client signup response",response)
      console.log("client signup response",response.message)
      if(response.message==="Client already exists, an email with verification code sent to your email" || response.message==="Client registered successfully. Please verify your email.") {
        setShowVerification(true)
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response.message||'Signup successful! Please check your email to verify your account.',
          props: { showIcon: true }, // Custom Prop for Icon
        });
      }
      if(response.message==="Client already verified"){
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Client already verified, please login!',
          props: { showIcon: true }, // Custom Prop for Icon
        });
      }
      
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
    }finally{
      // Re-enable the button
      setLoading(false);
    }
  };

  const handleVerify = async () => {
      setLoading(true)
      try {
        const response = await verifyClient({ mobile:form.mobile, verificationCode });
        console.log("ClientSignUpScreen.js handleVerify response", response)
        console.log("ClientSignUpScreen.js handleVerify response", response.message)
        if (response.message==="Wrong verification code, please check your email") {
          Toast.show({ type: "error", text1: "Verification Failed", text2: response.message });
          setLoading(false)
          return
          
        }
        
        Toast.show({ type: "success", text1: "Verification Successful", text2: "You can now sign in." });
        await AsyncStorage.setItem("userToken", response.token);
        await AsyncStorage.setItem("userType", "client");
        await AsyncStorage.setItem("userData", JSON.stringify(response.client));
        setLoading(false)
        navigation.replace("ClientHome"); // Redirect to home
      } catch (error) {
        Toast.show({ type: "error", text1: "Verification Failed", text2: error.message });
        setLoading(false)
      }
    };

  return (
    <View style={styles.container}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
    {!showVerification?(<>
        <Text style={styles.title}>Client Signup</Text>
      <Text style={styles.instructions}>
        All fields are mandatory. Password must be at least 8 characters long, containing at least 1 uppercase letter,
        1 lowercase letter, and 1 special character.
      </Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t("email")}
        value={form.email}
        onChangeText={(text)=>{setForm({...form,email:text})}}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder={i18n.t("name")}
        value={form.name}
        onChangeText={(text)=>{setForm({...form,name:text})}}
      />
      <TextInput
        style={styles.input}
        placeholder={i18n.t("password")}
        secureTextEntry
        value={form.password}
        onChangeText={(text)=>{setForm({...form,password:text})}}
      />
      <TextInput
        style={styles.input}
        placeholder="Mobile Number"
        keyboardType="numeric"
        value={form.mobile}
        onChangeText={(text)=>{setForm({...form,mobile:text})}}
      />
      {loading?<ActivityIndicator size="large" />:<Button title="Sign Up" onPress={handleSignup} disabled={loading} />}
      </>):(<>
                <Text style={styles.title}>Enter Verification Code</Text>
            <TextInput style={styles.input} placeholder={i18n.t("verification_code")} keyboardType="numeric" value={verificationCode} onChangeText={setVerificationCode} />
            {loading ? <ActivityIndicator size="large" /> :<Button title={i18n.t("verify")} color="#acc6f5" onPress={handleVerify}  />}
              </>)}

    </ScrollView>  
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 12,
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
});
