/**
 * ============================================================================
 * DRIVER HOME SCREEN - SEQUENCE DIAGRAM + FUNCTION MAP
 * ============================================================================
 *
 * VISUAL SEQUENCE DIAGRAM (Online -> Active -> Offline)
 * --------------------------------------------------------------------------
 * mermaid
 * sequenceDiagram
 *   participant D as "DriverHomeScreen"
 *   participant AS as "AsyncStorage"
 *   participant LOC as "Expo Location"
 *   participant API as "REST API (backend)"
 *   participant SM as "SocketManager"
 *   participant DS as "DriverSocket"
 *   participant BG as "BackgroundLocationService"
 *   participant BE as "Socket.IO Server"
 *   participant R as "Redis"
 *   participant W as "RideMatching Worker"
 *
 *   Note over D: App start / restore
 *   D->>AS: Read userToken + driverAvailable
 *   D->>LOC: Request foreground + background permissions
 *   D->>SM: initSocket() if driverAvailable=true
 *   SM->>BE: WebSocket connect (JWT in handshake)
 *   BE->>R: Join room "driver:{id}" and register events
 *   D->>BG: startBackgroundLocationTracking()
 *   D->>BE: socket.emit("driver:register")
 *
 *   Note over D: Toggle ONLINE
 *   D->>LOC: getCurrentPositionAsync()
 *   D->>API: PATCH /api/auth/driver/availability {available:true, location}
 *   D->>SM: initSocket()
 *   SM->>BE: connect -> emit "driverOnline"
 *   D->>BE: emit "driver:register"
 *   D->>DS: emitDriverOnline(coords)
 *   DS->>BE: emit "driverOnline" (coords)
 *   D->>BE: emit "driver:availability" {isAvailable:true}
 *   D->>BG: startBackgroundLocationTracking()
 *
 *   Note over BG: Background updates
 *   BG->>DS: emitLocation(coords)
 *   DS->>BE: emit "driverLocation" or "driverHeartbeat"
 *   BE->>R: Update GEO + presence TTL keys
 *
 *   Note over W: Ride matching
 *   W->>R: findNearbyDrivers()
 *   W->>BE: emit "ride_request" to room driver:{id}
 *   BE->>D: ride_request event
 *
 *   Note over D: Toggle OFFLINE / Logout
 *   D->>API: PATCH /api/auth/driver/availability {available:false}
 *   D->>BG: stopBackgroundLocationTracking()
 *   D->>SM: closeSocket()
 *   D->>BE: emit "driver:availability" {isAvailable:false} (if connected)
 *   BE->>R: remove from GEO + delete presence keys
 * --------------------------------------------------------------------------
 *
 * PURPOSE
 * - Main driver hub for availability, live requests, background tracking,
 *   and session safety.
 *
 * MAIN HOOKS AND FUNCTIONS
 * - useEffect (ride requests): init socket and listen to `ride_request`,
 *   push into `requests`, clean up on unmount.
 * - logAllAsyncStorage: debug helper to dump AsyncStorage keys and values.
 * - useEffect (initialization): request permissions, decode JWT to `driverId`,
 *   restore `driverAvailable`, start tracking if needed, register driver.
 * - toggleMenu: animate side menu open or close.
 * - handleLogout: if online set offline and stop tracking, close socket,
 *   clear storage, toast, navigate to Home.
 * - onToggleAvailability: guard cooldown and permissions, fetch GPS when
 *   going online, call backend, emit socket events, start or stop tracking,
 *   persist availability, reset requests.
 * - renderRequestItem: render ride request UI card.
 * - WideToggle: animated availability toggle component.
 *
 * STATE AND REFS
 * - isAvailable, updating, cooldownActive, requests
 * - driverIdRef, locationPermissionGranted
 *
 * INTEGRATIONS
 * - AsyncStorage: `userToken` for JWT, `driverAvailable` for persistence.
 * - REST API: `updateDriverAvailability` in `../services/api`.
 * - Socket.IO: `initSocket`, `getSocket`, `closeSocket`,
 *   `emitDriverOnline`, and `ride_request` listener.
 * - Background tracking: `startBackgroundLocationTracking`,
 *   `stopBackgroundLocationTracking`.
 * - Location permissions: `expo-location` foreground and background.
 * - Navigation: `navigation.replace('Home')` on logout or session failure.
 * - Localization and UI: `i18n`, `LanguageContext`, `LanguageToggle`,
 *   `LogViewer`, `Toast`, `Ionicons`.
 *
 * SAFETY RULES
 * - Background tracking must not run when offline.
 * - Socket listeners must be cleaned up on unmount.
 * - Cooldown prevents rapid availability toggles.
 *
 * ============================================================================
 */
 

import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
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
import { initSocket, getSocket, closeSocket } from '../services/SocketManager';
import { emitDriverOnline } from '../services/DriverSocket';

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
  /* Ride Request Listener                                               */
  /* ------------------------------------------------------------------ */
  

  const handleNearbyRides = useCallback((rides) => {
  console.log('Nearby rides received:', rides);

  // Replace list (not append)
  setRequests(rides || []);
}, []);

  const attachRideListeners = (socket) => {
  if (!socket) return;

  // ✅ Listen for nearby rides
  socket.off('nearby-rides');
  socket.on('nearby-rides', handleNearbyRides);
};
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
    (async () => {
         try {
          /* Step 1: Validate session token before doing anything else */
           const token = await AsyncStorage.getItem('userToken');
           console.log('DriverHomeScreen: Retrieved token from AsyncStorage:', token);
           if (!token) {
             console.warn('DriverHomeScreen: No user token found');
             Toast.show({
               type: 'error',
               text1: 'Session expired',
               text2: 'Please log in again',
             });

             await AsyncStorage.clear();
             navigation.replace('Home');
             return;
           }

           const decoded = jwtDecode(token);
           console.log('DriverHomeScreen: Decoded JWT:', decoded);
           const nowMs = Date.now();
           const expMs = decoded?.exp ? decoded.exp * 1000 : 0;
           if (!expMs || expMs <= nowMs) {
             console.warn('DriverHomeScreen: Token expired');
             Toast.show({
               type: 'error',
               text1: 'Session expired',
               text2: 'Please log in again',
             });

             await AsyncStorage.clear();
             navigation.replace('Home');
             return;
           }

           /* Step 2: Log storage (debug) and request location permissions */
            await logAllAsyncStorage();
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
   
           /* Step 3: Cache driver ID for later socket events */
           const driverId = decoded.id || decoded.sub;
           driverIdRef.current = driverId;
           console.log('DriverHomeScreen: driverId:', driverId);

           /* Step 4: Restore availability from AsyncStorage */
           const saved = await AsyncStorage.getItem('driverAvailable');
           const shouldBeOnline = saved === 'true';
           setIsAvailable(shouldBeOnline);

           /* Step 5: Only connect socket + tracking if saved availability is true */
           if (shouldBeOnline) {
            console.log('DriverHomeScreen: Restoring online state, initializing socket and tracking');
              const socket = await initSocket();
              attachRideListeners(socket);

              // ✅ Get fresh location
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });

              const coords = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              };

              // ✅ Send driver online again
              await emitDriverOnline(coords);

              // ✅ Register driver
              if (socket && driverIdRef.current) {
                socket.emit('driver:register', {
                  driverId: driverIdRef.current,
                  isAvailable: true,
                });
              }

              // ✅ Start tracking AFTER initial emit
              await startBackgroundLocationTracking();
            }
         } catch (e) {
           console.warn('DriverHomeScreen init error:', e);
         }
       })();

    return  () => {
      const socket = getSocket();
      socket?.off('nearby-rides', handleNearbyRides);
      stopBackgroundLocationTracking().catch(() => {});
    };
  }, [handleNearbyRides]);

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
        const socket = getSocket();
        socket?.emit('driver:availability', { isAvailable: false });
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
      closeSocket();
      await AsyncStorage.clear();
      navigation.replace('Home');
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
      /* Step 1: Collect GPS only when going online */
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
      const socket = await initSocket();
        attachRideListeners(socket);

      /* Step 2: Update backend availability (MongoDB) */
      const updateResult = await updateDriverAvailability(newValue, coords);
      console.log('DriverHomeScreen: Backend availability updated:', updateResult);

      /* Step 3: Only when going online, connect socket + start tracking */
      if (newValue ) {
        if (updateResult.message !== 'Availability updated successfully') {
          throw new Error('Backend did not confirm availability');
        }
        
        


        const started = await startBackgroundLocationTracking();
        if (!started) throw new Error('Tracking failed');

        if (socket && driverIdRef.current) {
          socket.emit('driver:register', {
            driverId: driverIdRef.current,
            isAvailable: true,
          });
        }

        await emitDriverOnline(coords);
        socket?.emit('driver:availability', { isAvailable: true });
      } else {
        const socket = getSocket();
        socket?.emit('driver:availability', { isAvailable: false });
        await stopBackgroundLocationTracking();
        closeSocket();
      }
      /* Step 4: Persist availability state locally */
          setIsAvailable(newValue);
          await AsyncStorage.setItem('driverAvailable', newValue ? 'true' : 'false');

      
      /* Step 5: Cooldown and UI reset */
      setCooldownActive(true);
      setTimeout(() => setCooldownActive(false), COOLDOWN_MS);
      setRequests([]);
    } catch (err) {
      console.error('DriverHomeScreen availability toggle error:', err);
      Toast.show({
        type: 'error',
        text1: 'Availability update failed',
      });
      // handleLogout()
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

