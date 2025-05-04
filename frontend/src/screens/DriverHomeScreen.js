import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import i18n from '../i18n/i18n';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { handleLogout } from "../utils/auth.js";

const DriverHomeScreen = () => {
  const navigation = useNavigation();
  const handleLogout = async () => {
    try {
      // Clear AsyncStorage
      await AsyncStorage.clear();
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'You have been successfully logged out.',
      });
      // Navigate to Home screen
      navigation.replace('Home');
    } catch (error) {
      console.error('Error during logout:', error);
      Toast.show({
        type: 'error',
        text1: 'Logout Failed',
        text2: 'An error occurred while logging out.',
      });
    }
  };


    
    return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Driver Home</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
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
    logoutButton: {
      backgroundColor: "#004080",
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 20,
    },
    logoutText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
  });
  
  export default DriverHomeScreen;