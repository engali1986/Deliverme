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
import i18n from '../i18n/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { LanguageContext } from '../context/LanguageContext.js';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LanguageToggle from '../components/LanguageToggle.js';
import { updateDriverAvailability } from '../services/api.js';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../services/backgroundLocationService.js';
import * as Location from 'expo-location';
import { jwtDecode } from 'jwt-decode';
import io from 'socket.io-client';

const DriverHomeScreen = () => {
  const { language } = useContext(LanguageContext);
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));

  const [isAvailable, setIsAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const COOLDOWN_MS = 10000;
  const [requests, setRequests] = useState([]);

  const socketRef = useRef(null);
  const driverIdRef = useRef(null);

  // Initialize Socket.IO
  useEffect(() => {
    socketRef.current = io('http://10.110.22.200:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current.id);
      // Register driver if available
      if (driverIdRef.current && isAvailable) {
        socketRef.current.emit('driver:register', { driverId: driverIdRef.current });
      }
    });

    socketRef.current.on('new_ride', (data) => {
      console.log('New ride request:', data);
      setRequests((prev) => [...prev, data]);
      Toast.show({
        type: 'success',
        text1: 'New Ride Request!',
        text2: `Pickup: ${data.pickupLocation?.address || 'Unknown'}`,
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Initialize permissions and load state
  useEffect(() => {
    (async () => {
      try {
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

          // Register with socket
          if (socketRef.current) {
            socketRef.current.emit('driver:register', { driverId });
          }
        }else{
          console.warn('DriverHomeScreen: No user token found');
        }

        // Load saved availability
        const saved = await AsyncStorage.getItem('driverAvailable');
        if (saved === 'true') {
          setIsAvailable(true);
          // Start background tracking if was available
          await startBackgroundLocationTracking();
        }
      } catch (e) {
        console.warn('DriverHomeScreen init error:', e);
      }
    })();

    // Cleanup on unmount
    return () => {
      stopBackgroundLocationTracking().catch(console.warn);
    };
  }, []);

  // Request background location permission (Android 11+)
  const requestBackgroundLocationPermission = async () => {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('Background location permission request failed:', e);
      return false;
    }
  };

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
      // Turn off availability before logout
      if (isAvailable) {
        await updateDriverAvailability(false, null);
        await stopBackgroundLocationTracking();
      }
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

  const onToggleAvailability = async (newValue) => {
    if (cooldownActive || updating) {
      Toast.show({ type: 'info', text1: 'Please wait', text2: 'Too many rapid changes' });
      return;
    }

    setUpdating(true);
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Location permission required',
          text2: 'Enable location to update availability.',
        });
        setUpdating(false);
        return;
      }

      // Get current position
      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      } catch (locErr) {
        console.error('Failed to get location', locErr);
        Toast.show({
          type: 'error',
          text1: 'Location error',
          text2: 'Could not get current location. Try again.',
        });
        setUpdating(false);
        return;
      }

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      // Call backend API
      const result = await updateDriverAvailability(newValue, coords);

      if (result && (result.ok === true || result.available === newValue)) {
        setIsAvailable(newValue);
        await AsyncStorage.setItem('driverAvailable', newValue ? 'true' : 'false');

        Toast.show({
          type: 'success',
          text1: 'Status updated',
          text2: newValue ? 'You are now available' : 'You are now unavailable',
        });

        // Emit to socket
        if (socketRef.current && driverIdRef.current) {
          socketRef.current.emit('driverStatus', {
            driverId: driverIdRef.current,
            status: newValue,
            location: coords,
          });
        }

        // Start/stop background location tracking
        if (newValue === true) {
          const started = await startBackgroundLocationTracking();
          if (!started) {
            Toast.show({
              type: 'error',
              text1: 'Background location failed',
              text2: 'Could not start background tracking',
            });
          }
        } else {
          await stopBackgroundLocationTracking();
        }

        setCooldownActive(true);
        setTimeout(() => setCooldownActive(false), COOLDOWN_MS);
        setRequests([]);
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

  const renderRequestItem = ({ item }) => (
    <View style={styles.requestItem}>
      <Text style={styles.requestTitle}>{item.title || 'Ride Request'}</Text>
      <Text style={styles.requestText}>{item.pickupAddress || item.pickup || 'Pickup unknown'}</Text>
      <Text style={styles.requestText}>Fare: ₹{item.fare ?? '—'}</Text>
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
          <View style={[styles.switchWrapper, isAvailable ? styles.switchWrapperActive : null]}>
            <WideToggle
              value={isAvailable}
              onValueChange={onToggleAvailability}
              disabled={updating || cooldownActive}
            />
          </View>
          {updating && <ActivityIndicator size="small" color="#1565C0" style={{ marginTop: 6 }} />}
        </View>
      </View>

      <View style={styles.infoBox}>
        {!isAvailable ? (
          <Text style={styles.instructionText}>
            Toggle the switch to become available and receive ride requests.
          </Text>
        ) : requests.length === 0 ? (
          <Text style={styles.noRequestsText}>No current requests</Text>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item, idx) => item.id ?? String(idx)}
            renderItem={renderRequestItem}
            style={styles.requestsList}
          />
        )}
      </View>

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

// --- WideToggle Component ---
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

  const offlineOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const onlineOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled}
      onPress={() => !disabled && onValueChange(!value)}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={[styles.wideToggleContainer, disabled && { opacity: 0.6 }]}
    >
      <Animated.View style={[styles.wideToggleTrack, { backgroundColor: bgColor }]} />

      <Animated.Text
        style={[styles.wideToggleLabel, { opacity: offlineOpacity, color: '#0D47A1' }]}
        numberOfLines={1}
      >
        OFFLINE
      </Animated.Text>

      <Animated.Text
        style={[styles.wideToggleLabel, { opacity: onlineOpacity, color: '#fff' }]}
        numberOfLines={1}
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
  container: {
    flex: 1,
    backgroundColor: '#e6f0ff',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  menuButton: {
    backgroundColor: '#004080',
    padding: 10,
    borderRadius: 6,
    marginRight: 12,
  },
  switchContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
    justifyContent: 'center',
  },
  switchWrapperActive: {
    backgroundColor: '#E3F2FD',
  },
  infoBox: {
    marginTop: 6,
    width: '100%',
    paddingHorizontal: 4,
  },
  instructionText: {
    textAlign: 'center',
    color: '#003366',
    fontSize: 16,
    backgroundColor: '#BBDEFB',
    padding: 12,
    borderRadius: 8,
  },
  noRequestsText: {
    textAlign: 'center',
    color: '#1565C0',
    fontSize: 16,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  requestsList: {
    width: '100%',
  },
  requestItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderColor: '#1976D2',
    borderWidth: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 6,
  },
  requestText: {
    color: '#1565C0',
    fontSize: 14,
    marginBottom: 4,
  },
  acceptButton: {
    marginTop: 8,
    backgroundColor: '#1565C0',
    paddingVertical: 10,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
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
});

export default DriverHomeScreen;
