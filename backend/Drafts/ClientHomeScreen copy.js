import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import i18n from '../i18n/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { LanguageContext } from '../context/LanguageContext.js';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LanguageToggle from '../components/LanguageToggle.js';

const ClientHomeScreen = () => {
  const { language } = useContext(LanguageContext);
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [fare, setFare] = useState('');
  const [region, setRegion] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    (async () => {
      let locationAcccess = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', locationAcccess);
      if (locationAcccess.status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission denied' });
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setPickupLocation('Current Location');
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
      Toast.show({ type: 'error', text1: 'Logout Failed', text2: error.message });
    }
  };

  const handleRequestRide = async () => {
    if (!pickupLocation || !destination || !fare) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill all ride details.',
      });
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://<your-ip>:5000/api/rides/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pickup: pickupLocation, destination, fare }),
      });
      const data = await response.json();
      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Ride Requested',
          text2: 'Searching for nearby drivers...',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    }
  };

  return (
    <View style={styles.container}>
      {/* Map Area */}
      <View style={styles.mapContainer}>
        {!mapReady && (
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="large" color="#004080" />
          </View>
        )}
        {region && (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsUserLocation
            initialRegion={region}
            onMapReady={() => setMapReady(true)}
          >
            <Marker coordinate={region} />
          </MapView>
        )}
      </View>

      {/* Menu Button */}
      <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
        <Ionicons name="menu" size={28} color="#004080" />
      </TouchableOpacity>

      {/* Ride Request Form */}
      <View style={styles.rideBox}>
        <TextInput
          style={styles.input}
          placeholder="To"
          value={destination}
          onChangeText={setDestination}
        />
        <TextInput
          style={styles.input}
          placeholder="EGP Offer your fare"
          keyboardType="numeric"
          value={fare}
          onChangeText={setFare}
        />
        <TouchableOpacity style={styles.findDriverBtn} onPress={handleRequestRide}>
          <Text style={styles.findDriverText}>Find a driver</Text>
        </TouchableOpacity>
      </View>

      {/* Side Menu Overlay */}
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
  container: { flex: 1, backgroundColor: '#e6f0ff' },
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  spinnerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    zIndex: 10,
  },
  menuButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 30,
    zIndex: 20,
    elevation: 3,
  },
  rideBox: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#e6f0ff',
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
  },
  input: {
    height: 40,
    borderColor: '#004080',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  findDriverBtn: {
    backgroundColor: '#004080',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  findDriverText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
