import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function DriverSignupScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [licensePhoto, setLicensePhoto] = useState(null);
  const [registrationPhoto, setRegistrationPhoto] = useState(null);
  const [criminalRecordPhoto, setCriminalRecordPhoto] = useState(null);
  const [personalPhoto, setPersonalPhoto] = useState(null);

  const validateInputs = () => {
    if (!email || !name || !password || !mobile || !licensePhoto || !registrationPhoto || !criminalRecordPhoto || !personalPhoto) {
      Alert.alert('Error', 'All fields, including images, are mandatory!');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address!');
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert(
        'Error',
        'Password must be at least 8 characters long, with at least 1 uppercase letter, 1 lowercase letter, and 1 special character!'
      );
      return false;
    }

    if (!/^\d{11}$/.test(mobile)) {
      Alert.alert('Error', 'Mobile number must be 11 digits!');
      return false;
    }

    return true;
  };

  const handleSignup = () => {
    if (validateInputs()) {
      // TODO: Integrate with backend API
      console.log('Driver signup successful:', {
        email,
        name,
        password,
        mobile,
        licensePhoto,
        registrationPhoto,
        criminalRecordPhoto,
        personalPhoto,
      });
      Alert.alert('Success', 'You have signed up successfully!');
    }
  };

  const pickImage = async (setImage) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Error', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Signup</Text>
      <Text style={styles.instructions}>
        All fields are mandatory. Password must be at least 8 characters long, containing at least 1 uppercase letter, 1 lowercase letter, and 1 special character.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
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
      
      {/* Upload Buttons */}
      <Text style={styles.label}>Driver’s License Photo</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(setLicensePhoto)}>
        <Text style={styles.uploadButtonText}>{licensePhoto ? 'Change Photo' : 'Upload Photo'}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Car Registration Photo</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(setRegistrationPhoto)}>
        <Text style={styles.uploadButtonText}>{registrationPhoto ? 'Change Photo' : 'Upload Photo'}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Criminal Record Photo</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(setCriminalRecordPhoto)}>
        <Text style={styles.uploadButtonText}>{criminalRecordPhoto ? 'Change Photo' : 'Upload Photo'}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Personal Photo</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage(setPersonalPhoto)}>
        <Text style={styles.uploadButtonText}>{personalPhoto ? 'Change Photo' : 'Upload Photo'}</Text>
      </TouchableOpacity>

      <Button title="Sign Up" onPress={handleSignup} />
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
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  uploadButton: {
    backgroundColor: '#007bff',
    padding: 10,
    marginBottom: 12,
    borderRadius: 4,
  },
  uploadButtonText: {
    color: '#ffffff',
    textAlign: 'center',
  },
});
