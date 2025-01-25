import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import i18n from '../i18n/i18n.js';
import {clientSignup} from "../services/api.js"

export default function ClientSignupScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');

  // Additional state to track loading status
  const [isLoading, setIsLoading] = useState(false);

  const validateInputs = () => {
    // Check if all fields are filled
    if (!email || !name || !password || !mobile) {
      Alert.alert('Error', 'All fields are mandatory!');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address!');
      return false;
    }

    // Validate password (at least 8 characters, 1 uppercase, 1 lowercase, 1 special character)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert(
        'Error',
        'Password must be at least 8 characters long, with at least 1 uppercase letter, 1 lowercase letter, and 1 special character!'
      );
      return false;
    }

    // Validate mobile number (numeric and 11 digits for Egypt)
    if (!/^\d{11}$/.test(mobile)) {
      Alert.alert('Error', 'Mobile number must be 11 digits!');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateInputs()){
      console.log("Please fill all data")
      Alert.alert('Error', i18n.t("missing_fields"));
      return;
    }

     // Disable the button
     setIsLoading(true);

    try {
      const data = { email, mobile, name, password };
      const response = await clientSignup(data);
      Alert.alert("Success", response.message || "Client signed up successfully");
    } catch (error) {
      Alert.alert("Error", error.message);
    }finally{
      // Re-enable the button
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Client Signup</Text>
      <Text style={styles.instructions}>
        All fields are mandatory. Password must be at least 8 characters long, containing at least 1 uppercase letter,
        1 lowercase letter, and 1 special character.
      </Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t("email")}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder={i18n.t("name")}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder={i18n.t("password")}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Mobile Number"
        keyboardType="numeric"
        value={mobile}
        onChangeText={setMobile}
      />
      <Button title="Sign Up" onPress={handleSignup} disabled={isLoading} />
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
