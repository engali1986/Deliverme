/**
 * DriverHomeScreen.js
 *
 * Production-ready driver home screen for a ride-hailing app.
 *
 * Features:
 * - Driver availability toggle (online/offline)
 * - Safe backend synchronization
 * - Background location tracking
 * - Socket.IO real-time integration
 * - Cooldown & spam protection
 * - Clean socket lifecycle handling
 *
 * Architecture rules:
 * - REST API: availability state + initial location
 * - Socket.IO: realtime availability & ride events
 * - Background task: movement updates (distance-based)
 */

import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  ActivityIndicator,
  FlatList,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { jwtDecode } from 'jwt-decode';

import i18n from '../i18n/i18n';
import { LanguageContext } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import LogViewer from '../components/LogViewer';

import { updateDriverAvailability } from '../services/api';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from '../services/backgroundLocationService';
import { initSocket, getSocket, closeSocket } from '../services/socket';

const COOLDOWN_MS = 10000;

const DriverHomeScreen = () => {
  const { language } = useContext(LanguageContext);
  const navigation = useNavigation();

  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-250)).current;

  const [isAvailable, setIsAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [requests, setRequests] = useState([]);

  const driverIdRef = useRef(null);
  const locationPermissionGranted = useRef(false);

  /* ------------------------------------------------------------------ */
  /* Initialization                                                     */
  /* ------------------------------------------------------------------ */
  const logAllAsyncStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();

    if (keys.length === 0) {
      console.log("AsyncStorage is empty");
      return;
    }

    const items = await AsyncStorage.multiGet(keys);

    console.log("===== AsyncStorage Dump =====");
    items.forEach(([key, value]) => {
      console.log(`${key}:`, value);
    });
    console.log("===== End AsyncStorage Dump =====");
  } catch (err) {
    console.warn("Failed to log AsyncStorage:", err);
  }
};
  useEffect(() => {
    let mounted = true;

    (async () => {
         try {
          // log all AsyncStorage items
            await logAllAsyncStorage();
           // Initialize socket connection
           await initSocket();
           // Foreground permission
            const { status: fgStatus } =
              await Location.requestForegroundPermissionsAsync();

            console.log(
              'DriverHomeScreen Foreground location permission:',
              fgStatus
            );

            // Background permission
            const { status: bgStatus } =
              await Location.requestBackgroundPermissionsAsync();

            console.log(
              'DriverHomeScreen Background location permission:',
              bgStatus
            );
            if(fgStatus === 'granted' && bgStatus === 'granted'){
              locationPermissionGranted.current = true;
            }
           if (fgStatus !== 'granted' || bgStatus !== 'granted') {
             console.warn('DriverHomeScreen Location permissions not granted');
           }
   
           // Get driver ID from token
           const token = await AsyncStorage.getItem('userToken');
           if (token) {
             const decoded = jwtDecode(token);
             const driverId = decoded.id || decoded.sub;
             driverIdRef.current = driverId;
             console.log('DriverHomeScreen: driverId:', driverId);
   
             
           }else{
             console.warn('DriverHomeScreen: No user token found');
             Toast.show({
                type: 'error',
                text1: 'Session expired',
                text2: 'Please log in again',
              });

              closeSocket();
              await AsyncStorage.clear();
              navigation.replace('Home');
              return;
           }
   
           // Load saved availability
           const saved = await AsyncStorage.getItem('driverAvailable');
           if (saved === 'true') {
             setIsAvailable(true);
             // Start background tracking if was available
             await startBackgroundLocationTracking();
             const socket = getSocket();
             if (socket && driverIdRef.current) {
               socket.emit('driver:register', { driverId: driverIdRef.current, isAvailable: true });
             }
           }
         } catch (e) {
           console.warn('DriverHomeScreen init error:', e);
         }
       })();

    return () => {
      mounted = false;
      const socket = getSocket();
      socket?.off('ride:request');
      stopBackgroundLocationTracking().catch(() => {});
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Menu                                                               */
  /* ------------------------------------------------------------------ */
  const toggleMenu = () => {
    Animated.timing(slideAnim, {
      toValue: menuVisible ? -250 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setMenuVisible(!menuVisible));
  };

  /* ------------------------------------------------------------------ */
  /* Logout                                                             */
  /* ------------------------------------------------------------------ */
  const handleLogout = async () => {
    try {
      if (isAvailable) {
        await updateDriverAvailability(false, null);
        await stopBackgroundLocationTracking();
      }

      closeSocket();
      await AsyncStorage.clear();

      Toast.show({
        type: 'success',
        text1: i18n.t('logout_success'),
      });

      navigation.replace('Home');
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: i18n.t('logout_error'),
      });
    }
  };

  /* ------------------------------------------------------------------ */
  /* Availability Toggle                                                */
  /* ------------------------------------------------------------------ */
  const onToggleAvailability = async (newValue) => {
    if (updating || cooldownActive) return;

    if (!locationPermissionGranted.current) {
      Toast.show({
        type: 'error',
        text1: 'Location permission missing',
      });
      return;
    }

    setUpdating(true);

    try {
      let coords = null;

      if (newValue) {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      }

      await updateDriverAvailability(newValue, coords);

      if (newValue) {
        const started = await startBackgroundLocationTracking();
        if (!started) throw new Error('Tracking failed');
      } else {
        await stopBackgroundLocationTracking();
      }

      setIsAvailable(newValue);
      await AsyncStorage.setItem('driverAvailable', newValue ? 'true' : 'false');

      const socket = getSocket();
      socket?.emit('driver:availability', {
        isAvailable: newValue,
      });

      setCooldownActive(true);
      setTimeout(() => setCooldownActive(false), COOLDOWN_MS);
      setRequests([]);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Availability update failed',
      });
    } finally {
      setUpdating(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* UI                                                                 */
  /* ------------------------------------------------------------------ */
  const renderRequestItem = ({ item }) => (
    <View style={styles.requestItem}>
      <Text style={styles.requestTitle}>Ride Request</Text>
      <Text style={styles.requestText}>{item.pickupAddress}</Text>
      <TouchableOpacity style={styles.acceptButton}>
        <Text style={styles.acceptButtonText}>Accept Ride</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Ionicons name="menu" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.switchContainer}>
  <View style={styles.switchWrapper}>
    <WideToggle
      value={isAvailable}
      onValueChange={onToggleAvailability}
      disabled={updating || cooldownActive}
    />
  </View>

  {updating && (
    <ActivityIndicator size="small" color="#1565C0" style={{ marginTop: 6 }} />
  )}
</View>
      </View>

      <View style={styles.infoBox}>
        {!isAvailable ? (
          <Text style={styles.instructionText}>
            Go online to start receiving rides
          </Text>
        ) : requests.length === 0 ? (
          <Text style={styles.noRequestsText}>Waiting for requests…</Text>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item, i) => item.id ?? String(i)}
            renderItem={renderRequestItem}
          />
        )}
        <LogViewer />
      </View>

      {menuVisible && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      <Animated.View
        style={[styles.sideMenu, { transform: [{ translateX: slideAnim }] }]}
      >
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

/* ------------------------------------------------------------------ */
/* Wide Toggle                                                         */
/* ------------------------------------------------------------------ */

const WideToggle = ({ value, onValueChange, disabled }) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const KNOB_SIZE = 36;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, Math.max(0, trackWidth - KNOB_SIZE - 4)],
  });

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(200,208,216,0.25)', 'rgba(21,101,192,1)'],
  });

  const offlineOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const onlineOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled}
      onPress={() => !disabled && onValueChange(!value)}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={[styles.wideToggleContainer, disabled && { opacity: 0.6 }]}
    >
      <Animated.View
        style={[styles.wideToggleTrack, { backgroundColor: bgColor }]}
      />

      <Animated.Text
        style={[
          styles.wideToggleLabel,
          { opacity: offlineOpacity, color: '#0D47A1' },
        ]}
      >
        OFFLINE
      </Animated.Text>

      <Animated.Text
        style={[
          styles.wideToggleLabel,
          { opacity: onlineOpacity, color: '#fff' },
        ]}
      >
        ONLINE
      </Animated.Text>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.wideToggleKnob,
          {
            transform: [{ translateX }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 3,
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e6f0ff', paddingTop: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  menuButton: { backgroundColor: '#004080', padding: 10, borderRadius: 6 },
  switchContainer: { flex: 1, alignItems: 'flex-end' },
  infoBox: { padding: 20 },
  instructionText: { textAlign: 'center', fontSize: 16 },
  noRequestsText: { textAlign: 'center', fontSize: 16 },
  requestItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  requestTitle: { fontWeight: '700' },
  requestText: { marginVertical: 6 },
  acceptButton: { backgroundColor: '#1565C0', padding: 10, borderRadius: 6 },
  acceptButtonText: { color: '#fff', textAlign: 'center' },
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
  logoutText: { color: '#fff', textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  wideToggleContainer: {
  width: '100%',
  height: 48,
  borderRadius: 28,
  justifyContent: 'center',
  paddingHorizontal: 6,
  overflow: 'hidden',
},
  wideToggleTrack: {
  ...StyleSheet.absoluteFillObject,
  borderRadius: 28,
},

wideToggleKnob: {
  position: 'absolute',
  left: 2,
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#fff',
},
wideToggleLabel: {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  textAlign: 'center',
  textAlignVertical: 'center',
  fontWeight: '700',
  fontSize: 13,
  includeFontPadding: false,
},

switchWrapper: {
  width: '100%',
  maxWidth: 420,
  backgroundColor: '#ffffff',
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 30,
  borderColor: '#1565C0',
  borderWidth: 1,
  elevation: 3,
},

});

export default DriverHomeScreen;
