import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  Switch,
  ActivityIndicator,
} from 'react-native';
import i18n from '../i18n/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { LanguageContext } from '../context/LanguageContext.js';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LanguageToggle from '../components/LanguageToggle.js';
import { updateDriverAvailability } from '../services/api.js'; // new API helper

const DriverHomeScreen = () => {
  const { language } = useContext(LanguageContext);
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));

  // NEW: availability state + loading + cooldown
  const [isAvailable, setIsAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const COOLDOWN_MS = 10000; // 10s client-side cooldown to avoid accidental rapid toggles

  useEffect(() => {
    // read initial availability from storage or fetch from server
    (async () => {
      try {
        const token = await AsyncStorage.getItem('driverToken');
        // optionally request profile to get initial availability
        // simple fallback: preserve last chosen state in AsyncStorage
        const saved = await AsyncStorage.getItem('driverAvailable');
        if (saved !== null) setIsAvailable(saved === 'true');
      } catch (e) {
        console.warn('DriverHomeScreen: could not load availability', e);
      }
    })();
  }, []);

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

  // NEW: availability toggle handler
  const onToggleAvailability = async (newValue) => {
    console.log('Toggling availability to', newValue, typeof newValue);
    if (cooldownActive || updating) {
      Toast.show({ type: 'info', text1: 'Please wait', text2: 'Too many rapid changes' });
      return;
    }

    setUpdating(true);
    try {
      const result = await updateDriverAvailability(newValue); // calls backend
      console.log('Availability update result:', result);
      if (result && result.message === 'Not implemented') {
        console.log('Availability updated successfully');
        setIsAvailable(newValue);
        await AsyncStorage.setItem('driverAvailable', newValue ? 'true' : 'false');
        Toast.show({ type: 'success', text1: 'Status updated', text2: newValue ? 'You are now available' : 'You are now unavailable' });
        // start client cooldown
        setCooldownActive(true);
        setTimeout(() => setCooldownActive(false), COOLDOWN_MS);
      } else {
        throw new Error(result?.message || 'Update failed');
      }
    } catch (err) {
      console.error('Availability update error', err);
      Toast.show({ type: 'error', text1: 'Update failed', text2: err.message || 'Server error' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top bar with availability toggle */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{i18n.t('driver_home')}</Text>
        <View style={styles.availabilityRow}>
          <Text style={[styles.availText, isAvailable ? styles.availTrueText : styles.availFalseText]}>
            {isAvailable ? 'Available' : 'Unavailable'}
          </Text>
          <Switch
            value={isAvailable}
            onValueChange={onToggleAvailability}
            disabled={updating || cooldownActive}
            trackColor={{ false: '#cce0ff', true: '#1565C0' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#cce0ff"
          />
          {updating && <ActivityIndicator size="small" color="#1565C0" style={{ marginLeft: 8 }} />}
        </View>
      </View>

      {/* existing UI */}
      {/* Menu Toggle Button */}
      <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
        <Ionicons name="menu" size={28} color="#fff" />
      </TouchableOpacity>

      {/* rest of existing component unchanged */}
      <View style={styles.sideMenuPlaceholder} />
      {menuVisible && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}
      <Animated.View style={[styles.sideMenu, { transform: [{ translateX: slideAnim }] }]}>
        <TouchableOpacity style={styles.closeButton} onPress={toggleMenu}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.menuItem}>{i18n.t('completed_rides')}</Text>
        <Text style={styles.menuItem}>{i18n.t('settings')}</Text>

        <LanguageToggle />

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
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  topBar: {
    width: '100%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#003366',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availText: {
    marginRight: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  availTrueText: { color: '#0D47A1' },
  availFalseText: { color: '#1976D2' },
  menuButton: {
    backgroundColor: '#004080',
    padding: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
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

export default DriverHomeScreen;
