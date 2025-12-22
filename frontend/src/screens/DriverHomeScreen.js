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
  useEffect(() => {
    let mounted = true;

    (async () => {
         try {
           // Initialize socket connection
           await initSocket();
           // Request foreground + background location permissions
           const { status: fgStatus } = await Location.requestForegroundPermissionsAsync().then(res=>{
             console.log('DriverHomeScreen Foreground location permission status:', res.status);
             return res;
           }).catch(err=>{ console.warn('Foreground location permission request failed:', err); return { status: 'denied' }; })  ;
           const bgStatus = await requestBackgroundLocationPermission().then(granted=>{
             console.log('DriverHomeScreen Background location permission granted:', granted);
             return granted ? 'granted' : 'denied';
           }).catch(err=>{ console.warn('Background location permission request failed:', err); return 'denied'; }); 
           console.log('DriverHomeScreen Location permissions:', fgStatus, bgStatus);
   
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
          <WideToggle
            value={isAvailable}
            onValueChange={onToggleAvailability}
            disabled={updating || cooldownActive}
          />
          {updating && <ActivityIndicator size="small" />}
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

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 46],
  });

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={styles.toggleContainer}
    >
      <Animated.View style={styles.toggleTrack} />
      <Animated.View
        style={[styles.toggleKnob, { transform: [{ translateX }] }]}
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
  sideMenu: { position: 'absolute', width: 250, left: 0, top: 0, bottom: 0 },
  closeButton: { position: 'absolute', right: 10, top: 10 },
  logoutButton: { marginTop: 40, backgroundColor: '#003366', padding: 12 },
  logoutText: { color: '#fff', textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  toggleContainer: { width: 80, height: 40, backgroundColor: '#ccc', borderRadius: 20 },
  toggleTrack: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
  toggleKnob: {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 18,
    position: 'absolute',
    top: 2,
    left: 2,
  },
});

export default DriverHomeScreen;
