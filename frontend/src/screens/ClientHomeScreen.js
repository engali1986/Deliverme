import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import i18n from '../i18n/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { LanguageContext } from '../context/LanguageContext.js';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LanguageToggle from '../components/LanguageToggle.js';

const { width, height } = Dimensions.get('window');

const ClientHomeScreen = () => {
  const { language } = useContext(LanguageContext);
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [fare, setFare] = useState('');
  const [region, setRegion] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission denied',
          text2: 'Location access is required.',
        });
        return;
      }
      setLocationPermission(true);

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
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
      Toast.show({
        type: 'error',
        text1: i18n.t('logout_error'),
        text2: i18n.t('logout_failed'),
      });
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
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message,
      });
    }
  };

  return (
    <View style={styles.container}>
      {region && (
        <MapView style={styles.map} region={region} showsUserLocation={true}>
          <Marker coordinate={region} title="You are here" />
        </MapView>
      )}

      <ScrollView style={styles.formContainer}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>{i18n.t('client_home')}</Text>

        <Text style={styles.label}>{i18n.t('pickup_location')}</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('enter_pickup')}
          value={pickupLocation}
          onChangeText={setPickupLocation}
        />

        <Text style={styles.label}>{i18n.t('destination')}</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('enter_destination')}
          value={destination}
          onChangeText={setDestination}
        />

        <Text style={styles.label}>{i18n.t('fare_offer')}</Text>
        <TextInput
          style={styles.input}
          placeholder="EGP"
          keyboardType="numeric"
          value={fare}
          onChangeText={setFare}
        />

        <TouchableOpacity style={styles.requestButton} onPress={handleRequestRide}>
          <Text style={styles.requestText}>{i18n.t('find_driver')}</Text>
        </TouchableOpacity>
      </ScrollView>

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
  },
  map: {
    width: width,
    height: height / 3,
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#e6f0ff',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#003366',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#003366',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    height: 40,
    borderColor: '#004080',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  requestButton: {
    backgroundColor: '#004080',
    paddingVertical: 14,
    borderRadius: 6,
    marginTop: 20,
    alignItems: 'center',
  },
  requestText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
