import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import i18n from '../i18n/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { LanguageContext } from '../context/LanguageContext.js';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LanguageToggle from '../components/LanguageToggle.js';


const ClientHomeScreen = () => {
  const { language } = useContext(LanguageContext);
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -250,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      Toast.show({
        type: 'success',
        text1: i18n.t('logout_success'),
        text2: i18n.t('logout_message'),
      });
      navigation.replace('Home');
    } catch (error) {
      console.error('Logout error:', error);
      Toast.show({
        type: 'error',
        text1: i18n.t('logout_error'),
        text2: i18n.t('logout_failed'),
      });
    }
  };

  

  return (
    <View style={styles.container}>
      {/* Menu Toggle Button */}
      <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
        <Ionicons name="menu" size={28} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.title}>{i18n.t('client_home')}</Text>

      {/* Side Menu Overlay */}
      {menuVisible && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Side Menu Panel */}
      <Animated.View style={[styles.sideMenu, { transform: [{ translateX: slideAnim }] }]}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={toggleMenu}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.menuItem}>{i18n.t('completed_rides')}</Text>
        <Text style={styles.menuItem}>{i18n.t('settings')}</Text>

        {/* Language Toggle */}
        <LanguageToggle />

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{i18n.t('logout')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f0ff',
    paddingTop: 100,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#003366',
    textAlign: 'center',
    marginTop: 20,
  },
  menuButton: {
    backgroundColor: '#004080',
    padding: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: '#cce0ff',
    padding: 20,
    paddingTop: 60,
    zIndex: 200,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 210,
    backgroundColor: '#003366',
    padding: 5,
    borderRadius: 15,
  },
  menuItem: {
    marginVertical: 15,
    fontSize: 18,
    color: '#003366',
  },
  logoutButton: {
    marginTop: 40,
    backgroundColor: '#003366',
    paddingVertical: 12,
    borderRadius: 6,
  },
  logoutText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 100,
  },
});

export default ClientHomeScreen;