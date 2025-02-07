import React, { useState } from "react";
import { View, Text, TextInput, Button, TouchableOpacity, ActivityIndicator, Image, Alert, StyleSheet, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import i18n from '../i18n/i18n.js';
import {driverSignup} from "../services/api.js"

const DriverSignupScreen = ({ navigation }) => {
  
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
        Alert.alert('Error', 'All fields are mandatory!');
        return false;
      }
  
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        Alert.alert('Error', 'Please enter a valid email address!');
        return false;
      }
  
      // Validate password (at least 8 characters, 1 uppercase, 1 lowercase, 1 special character)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
      if (!passwordRegex.test(form.password)) {
        Alert.alert(
          'Error',
          'Password must be at least 8 characters long, with at least 1 uppercase letter, 1 lowercase letter, and 1 special character!'
        );
        return false;
      }
  
      // Validate mobile number (numeric and 11 digits for Egypt)
      if (!/^\d{11}$/.test(form.mobile)) {
        Alert.alert('Error', 'Mobile number must be 11 digits!');
        return false;
      }
  
      return true;
    };

 

  // Function to handle image selection
  const pickImage = async (field) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      // Validate file size (max 1MB)
      const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
      if (fileInfo.size > 1024 * 1024) {
        Alert.alert("File size must be under 1MB");
        return;
      }
      setForm({ ...form, [field]: result.assets[0].uri });
    }
  };

  // Function to handle input validation and form state update
  const handleInputChange = (field, value) => {
    if (field === "email" && !validateEmail(value)) {
      Alert.alert("Invalid email format. Please use English characters only.");
      return;
    }
    if (field === "password" && !validatePassword(value)) {
      Alert.alert("Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one special character.");
      return;
    }
    if ((field === "name" || field === "mobile") && !validateEnglishText(value)) {
      Alert.alert("Name and Mobile must contain only English letters and numbers.");
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
          Alert.alert('Error', i18n.t("missing_fields"));
          return;
        }

    setLoading(true);
    // const formData = new FormData();
    // Object.keys(form).forEach((key) => {
    //   formData.append(key, form[key]);
    // });

   
     try {
  const response = await driverSignup(form); // Call the API function
  Alert.alert("Signup successful! Please check your email to verify your account.");
  navigation.navigate("DriverSignin");
     } catch (error) {
  Alert.alert("Signup failed. Please try again.");
  console.error(error);
     } finally {
  setLoading(false);
     }
  };

  return (
    <View style={styles.container}>
      <ScrollView>

      
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

