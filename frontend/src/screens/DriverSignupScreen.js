import React, { useState } from "react";
import { View, Text, TextInput, Button, TouchableOpacity, ActivityIndicator, Image, Alert, StyleSheet, ScrollView } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import i18n from '../i18n/i18n.js';
import {driverSignup, verifyDriver} from "../services/api.js"
import Toast from 'react-native-toast-message';

const DriverSignupScreen = ({ navigation }) => {
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState("");

  
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

 

  // Function to handle image selection
  // const pickImage = async (field) => {
  //   const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  //   console.log("image status:", status)
  //   if (status !== "granted") {
  //     Alert.alert("Permission Denied", "You need to grant gallery access.");
  //     return;
  //   }
  
  //   let result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: 'images',
  //     allowsEditing: true,
  //     aspect: [4, 3],
  //     quality: 1,
  //     });
  
  //   // If gallery fails, try opening the camera
  //   if (result.canceled || result.assets.length === 0) {
  //     let result = await ImagePicker.launchImageLibraryAsync({
  //       mediaTypes: ['images', 'videos'],
  //       allowsEditing: true,
  //       aspect: [4, 3],
  //       quality: 1,
  //       });
  
  //     if (!cameraResult.canceled && cameraResult.assets.length > 0) {
  //       result = cameraResult;
  //     }
  //   }
  
  //   if (!result.canceled && result.assets.length > 0) {
  //     const imageUri = result.assets[0].uri;
  //     const fileInfo = await FileSystem.getInfoAsync(imageUri);
  //     if (fileInfo.size > 1024 * 1024) {
  //       Alert.alert("File too large", "File size must be under 1MB");
  //       return;
  //     }
  
  //     setForm((prev) => ({ ...prev, [field]: imageUri }));
  //   }
  // };

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
  

  // Function to handle input validation and form state update
  const handleInputChange = (field, value) => {
    if (field === "email" && !validateEmail(value)) {
      // Alert.alert("Invalid email format. Please use English characters only.");
      Toast.show({
        type: 'error', // or 'error'
        text1: 'Error',
        text2:'Invalid email format. Please use English characters only.',
        props: { showIcon: true }, // Custom Prop for Icon
      });
      return;
    }
    if (field === "password" && !validatePassword(value)) {
      // Alert.alert("Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one special character.");
      Toast.show({
        type: 'error', // or 'error'
        text1: 'Error',
        text2:'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one special character.',
        props: { showIcon: true }, // Custom Prop for Icon
      });
      return;
    }
    if ((field === "name" || field === "mobile") && !validateEnglishText(value)) {
      // Alert.alert("Name and Mobile must contain only English letters and numbers.");
      Toast.show({
        type: 'error', // or 'error'
        text1: 'Error',
        text2:'Name and Mobile must contain only English letters and numbers.',
        props: { showIcon: true }, // Custom Prop for Icon
      });
      return;
    }
    setForm({ ...form, [field]: value });
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
    // const formData = new FormData();
    // Object.keys(form).forEach((key) => {
    //   formData.append(key, form[key]);
    // });

   
     try {
  const response = await driverSignup(form).then(res=>{
    console.log("Driver signup response",res)
    return res
  }); // Call the API function
  console.log("Driver signup response", response)
  // Alert.alert("Signup successful! Please check your email to verify your account.");
  Toast.show({
    type: 'success', // or 'error'
    text1: 'Success.',
    text2:'Signup successful! Please check your email to verify your account.',
    props: { showIcon: true }, // Custom Prop for Icon
  });
  setShowVerification(true)
  // navigation.navigate("DriverSignin");
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
  setLoading(true);
  if (!verificationCode) {
    setLoading(false);
  Toast.show({
    type: 'error', // or 'error'
    text1: 'Error.',
    text2:"Please enter the verification code",
    props: { showIcon: true }, // Custom Prop for Icon
  });
  return;
  }
  
  try {
    const responce=await verifyDriver({ mobile:form.mobile, verificationCode });
    // Alert.alert("Verification successful!");
    if (responce.message && responce.message==="Wrong verification code, please check your email") {
      Toast.show({
        type: 'error', // or 'error'
        text1: 'Error',
        text2:"Wrong verification code, please check your email",
        props: { showIcon: true }, // Custom Prop for Icon
      });
      setLoading(false);
    }else{
      Toast.show({
        type: 'success', // or 'error'
        text1: 'Success.',
        text2:"Verification successful!",
        props: { showIcon: true }, // Custom Prop for Icon
      });
      setLoading(false);

    }
   
    // navigation.navigate("DriverHome"); // Redirect to Driver Home after verification
  } catch (error) {
    // Alert.alert("Invalid code. Please try again.");
    Toast.show({
      type: 'error', // or 'error'
      text1: 'Error',
      text2:"Invalid code. Please try again.",
      props: { showIcon: true }, // Custom Prop for Icon
    });
    setLoading(false);
  }
  
  };

  return (
    <View style={styles.container}>
      <ScrollView>
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

