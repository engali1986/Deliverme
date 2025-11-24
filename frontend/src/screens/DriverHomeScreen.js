import React, { useState, useContext, useEffect, useRef, use } from 'react';
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
import { updateDriverAvailability } from '../services/api.js'; // API helper
import * as Location from 'expo-location';
import { jwtDecode } from 'jwt-decode';
import io from 'socket.io-client';

const DriverHomeScreen = () => {
  const { language } = useContext(LanguageContext);
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));

  // availability + cooldown + requests
  const [isAvailable, setIsAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const COOLDOWN_MS = 10000; // 10s client-side cooldown
  const [requests, setRequests] = useState([]); // current incoming requests list
  const socketRef = useRef(null);
  // useEffect for socket.io testing can be added here
  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://10.158.201.200:5000'); // replace with actual backend URL
    const socket = socketRef.current;

    // socket.on('connect', () => {
    //   console.log('Socket connected:', socket.id);
    //   // Optionally emit drivers current location or status here
    //   socket.emit('driverStatus', { id: socket.id, status: isAvailable });
    // });

    // return () => {
    //   socket.disconnect();
    // };
  }, []);

  useEffect(() => {
    (async () => {
      // Request location permission on mount
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Location permission required',
          text2: 'Enable location to use this feature.',
        });
        return; // Stop initialization if permission is not granted
      }
      // Get userId from token from AsyncStorage if needed
      const token = await AsyncStorage.getItem('userToken');
      const decoded = jwtDecode(token);
      const userId = decoded.id;
      console.log('DriverHomeScreen: decoded token:', decoded);
      console.log('DriverHomeScreen: userId from token:', userId);
    

      // load saved availability from AsyncStorage
      try {
        const saved = await AsyncStorage.getItem('driverAvailable');
        if (saved !== null) setIsAvailable(saved === 'true');
        // optionally fetch current pending requests for driver here
        // fetchDriverRequests() ...
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

  const onToggleAvailability = async (newValue) => {
    if (cooldownActive || updating) {
      Toast.show({ type: 'info', text1: 'Please wait', text2: 'Too many rapid changes' });
      return;
    }

    setUpdating(true);
    try {
      // Request location permission first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Location permission required',
          text2: 'Enable location to update availability.',
        });
        setUpdating(false);
        return; // exit early if permission denied
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

      // include location when calling backend
      const result = await updateDriverAvailability(newValue, coords); // backend call

      // Expecting { ok: true, available: boolean } or similar
      if (result && (result.ok === true || result.available === newValue)) {
        setIsAvailable(newValue);
        await AsyncStorage.setItem('driverAvailable', newValue ? 'true' : 'false');
        Toast.show({
          type: 'success',
          text1: 'Status updated',
          text2: newValue ? 'You are now available' : 'You are now unavailable',
        });
        // Emit status via socket.io
        console.log('Emitting driverStatus via socket.io:', { id: socketRef.current.id, status: newValue, location: coords });  
        socketRef.current.emit('driverStatus', { id: socketRef.current.id, status: newValue, location: coords });
        // start client cooldown
        setCooldownActive(true);
        setTimeout(() => setCooldownActive(false), COOLDOWN_MS);

        if (newValue===true) {
          setRequests([]); // keep empty until server pushes requests
        } else {
          setRequests([]); // hide requests when unavailable
        }
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
      <Text style={styles.requestText}>Fare: {item.fare ?? '—'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top row: menu button at left and wide availability switch filling remaining width */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Ionicons name="menu" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.switchContainer}>
          <View style={[styles.switchWrapper, isAvailable ? styles.switchWrapperActive : null]}>
            <WideToggle value={isAvailable} onValueChange={onToggleAvailability} disabled={updating || cooldownActive} />
          </View>
          {updating && <ActivityIndicator size="small" color="#1565C0" style={{ marginTop: 6 }} />}
        </View>
      </View>

      {/* Instruction or requests area below top row */}
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
            ListEmptyComponent={<Text style={styles.noRequestsText}>No current requests</Text>}
          />
        )}
      </View>

      {/* existing side menu overlay / animated menu */}
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

// --- Updated WideToggle component (labels centered) ---
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

      {/* centered labels */}
      <Animated.Text
        style={[
          styles.wideToggleLabel,
          { opacity: offlineOpacity, color: '#0D47A1' },
        ]}
        numberOfLines={1}
      >
        OFFLINE
      </Animated.Text>

      <Animated.Text
        style={[
          styles.wideToggleLabel,
          { opacity: onlineOpacity, color: '#fff' },
        ]}
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
// --- end WideToggle ---

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
    // no space-between: menu left, switch fills remaining space
    marginBottom: 18,
  },
  menuButton: {
    backgroundColor: '#004080',
    padding: 10,
    borderRadius: 6,
    marginRight: 12,
  },
  // NEW: container that takes remaining width
  switchContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  // switchWrapper now stretches to remaining width
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
  switch: {
    alignSelf: 'flex-end',
    transform: [{ scaleX: 1.8 }, { scaleY: 1.4 }], // make switch visually wider
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
  // CENTERED label style
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
