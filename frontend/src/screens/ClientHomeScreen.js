/**
 * ClientHomeScreen.js
 * 
 * This file defines the main screen for the client-side of the app. It provides functionalities
 * for selecting pickup and destination locations, calculating the route distance, validating fares,
 * and requesting rides. It also includes a side menu for additional options like completed rides,
 * settings, and logout.
 * 
 * Key Features:
 * 1. Dynamic Map Interaction:
 *    - Displays the user's current location on the map.
 *    - Allows the user to select pickup and destination locations.
 *    - Automatically adjusts the map view to fit the markers.
 *    - Displays the route between the pickup and destination locations.
 * 
 * 2. Fare Validation:
 *    - Calculates the minimum fare based on the distance and a rate per kilometer (KM_RATE).
 *    - Ensures the entered fare is not less than the minimum fare.
 * 
 * 3. Multi-Language Support:
 *    - Uses i18n for internationalization.
 * 
 * 4. Toast Notifications:
 *    - Provides feedback for errors and success events.
 * 
 * 5. Responsive UI:
 *    - Includes animations for the side menu and loading indicators for the map.
 * 
 * State Variables:
 * - pickupCoords: Stores the coordinates of the pickup location.
 * - destinationRegion: Stores the coordinates of the destination location.
 * - region: Stores the initial region for the map.
 * - mapReady: Tracks whether the map is ready to be displayed.
 * - routeDistance: Stores the calculated distance between the pickup and destination locations.
 * - pickupLocation: Stores the address of the pickup location.
 * - destination: Stores the address of the destination location.
 * - fare: Stores the fare entered by the user.
 * - modalVisible: Controls the visibility of the modal for entering details.
 * - modalField: Tracks which field (pickup, destination, or fare) is being edited in the modal.
 * - modalValue: Stores the value entered in the modal.
 * - menuVisible: Controls the visibility of the side menu.
 * - slideAnim: Manages the animation for the side menu.
 * 
 * Functions:
 * 1. useEffect for Initial Location Setup:
 *    - Fetches the user's current location and sets it as the default pickup location.
 * 
 * 2. useEffect for Fitting Map to Markers:
 *    - Automatically adjusts the map view to fit both the pickup and destination markers.
 * 
 * 3. calculateMinimumFare:
 *    - Calculates the minimum fare based on the distance between the pickup and destination locations.
 * 
 * 4. validateAndSetFare:
 *    - Validates the fare entered by the user and updates the fare state if valid.
 * 
 * 5. toggleMenu:
 *    - Toggles the visibility of the side menu with an animation.
 * 
 * 6. handleLogout:
 *    - Logs the user out by clearing their data from AsyncStorage and navigating to the home screen.
 * 
 * 7. handleRequestRide:
 *    - Sends a ride request to the server with the entered details.
 * 
 * 8. openModal:
 *    - Opens the modal for editing a specific field (pickup, destination, or fare).
 * 
 * 9. saveModalValue:
 *    - Saves the value entered in the modal to the appropriate state variable.
 * 
 * 10. onMapReady:
 *    - Sets the mapReady state to true when the map is fully loaded.
 * 
 * 11. onReady in MapViewDirections:
 *    - Updates the routeDistance when the route between the pickup and destination is calculated.
 * 
 * Components:
 * 1. Map Area:
 *    - Displays the map with markers for the pickup and destination locations.
 *    - Shows the route between the two locations using MapViewDirections.
 * 
 * 2. Ride Request Form:
 *    - Allows the user to enter the pickup location, destination, and fare.
 *    - Validates the fare and ensures all fields are filled before requesting a ride.
 * 
 * 3. Side Menu:
 *    - Provides options for completed rides, settings, and logout.
 *    - Slides in and out of view with an animation.
 * 
 * 4. Modal:
 *    - Allows the user to edit the pickup location, destination, or fare.
 *    - Validates the entered fare before saving.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import i18n from '../i18n/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { LanguageContext } from '../context/LanguageContext.js';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LanguageToggle from '../components/LanguageToggle.js';
import MapViewDirections from 'react-native-maps-directions';
import { API_KEY, KM_RATE } from '@env';

const { height } = Dimensions.get('window');

const ClientHomeScreen = () => {
  const { language } = useContext(LanguageContext);
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [fare, setFare] = useState('');
  const [region, setRegion] = useState(null);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [address, setAddress] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalField, setModalField] = useState(null); // 'pickup' | 'destination' | 'fare'
  const [modalValue, setModalValue] = useState('');
  const [destinationRegion, setDestinationRegion] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null); // Distance in kilometers
  const mapRef = useRef(null);

  // 1. On mount, set pickup to current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('ClientHomeScreen.js: Location permission not granted');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      console.log('ClientHomeScreen.js: Got current location', location.coords);
      setPickupCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      let [place] = await Location.reverseGeocodeAsync(location.coords);
      let pickupAddress = place
        ? `${place.name || ''} ${place.street || ''} ${place.city || ''}`.trim()
        : 'Current Location';
      setPickupLocation(pickupAddress);
      setAddress(pickupAddress);
      console.log('ClientHomeScreen.js: Set pickup address', pickupAddress);
    })();
  }, []);

  // 2. Whenever both markers are set, fit map to show both
  useEffect(() => {
    if (mapRef.current && pickupCoords && destinationRegion) {
      console.log('ClientHomeScreen.js: Fitting map to pickup and destination markers', pickupCoords, destinationRegion);
      mapRef.current.fitToCoordinates(
        [
          { latitude: pickupCoords.latitude, longitude: pickupCoords.longitude },
          { latitude: destinationRegion.latitude, longitude: destinationRegion.longitude }
        ],
        {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated: true,
        }
      );
    }
  }, [pickupCoords, destinationRegion]);

   // 3. Calculate the minimum fare based on distance
  const calculateMinimumFare = () => {
    if (routeDistance) {
      return routeDistance * parseFloat(KM_RATE); // Multiply distance by KM_RATE
    }
    return 0;
  };

  // 4. Validate and set fare
  const validateAndSetFare = (inputFare) => {
    const minimumFare = calculateMinimumFare();
    console.log('ClientHomeScreen.js: Calculated minimum fare', minimumFare);
    if (inputFare < minimumFare) {
      Toast.show({
        type: 'error',
        text1: i18n.t('Invalid_Fare'),
        text2: `The fare must be at least ${minimumFare.toFixed(2)} EGP.`,
      });
      setFare(''); // Clear fare input
      return; // Do not update the fare
    }
    console.log('ClientHomeScreen.js: Setting fare to', inputFare);
    console.log('ClientHomeScreen.js: type of fair', typeof inputFare);
    setFare(inputFare.toString()); // Update the fare if valid
  };
  // Menu toggle animation
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
    console.log('ClientHomeScreen.js: Requesting ride with', { pickupLocation, destination, fare });
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

  // Helper to open modal for a specific field
  const openModal = (field, value) => {
    console.log('ClientHomeScreen.js: Opening modal for field', field, 'with value', value);
    setModalField(field);
    setModalValue(value);
    setFare(''); // Clear fare when opening modal
    setModalVisible(true);
  };

  // Helper to save modal value to the correct field
  const saveModalValue = () => {
    console.log('ClientHomeScreen.js: Saving modal value', modalValue, 'for field', modalField);
    if (modalField === 'pickup') setPickupLocation(modalValue);
    if (modalField === 'destination') setDestination(modalValue);
    if (modalField === 'fare') {
      console.log('ClientHomeScreen.js: Validating fare input', modalValue);
      if (isNaN(modalValue) || parseFloat(modalValue) <= 0 || modalValue.length===0) {
        setFare(''); // Clear fare input
        return; // Invalid fare input
      }
      validateAndSetFare(parseFloat(modalValue)); // Validate fare before setting

    } 
    setModalVisible(false);
  };


  return (
    <View style={styles.rootWrapper}>
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
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
               apikey= {API_KEY}
              showsUserLocation
              initialRegion={region}
              onMapReady={() => {
                setMapReady(true);
                console.log('ClientHomeScreen.js: Map is ready');
              }}
            >
              {pickupCoords && (
                <Marker coordinate={pickupCoords}>
                  <Ionicons name="location-sharp" size={36} color="red" />
                </Marker>
              )}
              {destinationRegion && (
                <Marker coordinate={destinationRegion}>
                  <Ionicons name="location-sharp" size={36} color="blue" />
                </Marker>
              )}
              {pickupCoords && destinationRegion && (
                <MapViewDirections
                  origin={pickupCoords}
                  destination={destinationRegion}
                  apikey= {API_KEY}// Replace with your actual key
                  strokeWidth={4}
                  strokeColor="dodgerblue"
                  onReady={result => {
                  console.log('ClientHomeScreen.js Route distance (km):', result.distance);
                  console.log('ClientHomeScreen.js Route duration (min):', result.duration);
                  // You can set this in state to display in your UI:
                  setRouteDistance(result.distance);
                  // setRouteDuration(result.duration);
                }}
                />
              )}
            </MapView>

            
          )}
         
        </View>

        {/* Menu Button */}
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Ionicons name="menu" size={28} color="#004080" />
        </TouchableOpacity>

        {/* Ride Request Form */}
        <View style={styles.rideBox}>
          <TouchableOpacity onPress={() => openModal('pickup', pickupLocation)}>
            <TextInput
              style={styles.input}
              placeholder={address || 'Current Location'}
              value={pickupLocation}
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openModal('destination', destination)}>
            <TextInput
              style={styles.input}
              placeholder="To"
              value={destination}
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
          <TouchableOpacity disabled={destination.length===0 || pickupLocation.length===0? true: false} onPress={() => openModal('fare', fare)}>
            <TextInput
              style={styles.input}
              placeholder="EGP Offer your fare"
              keyboardType="numeric"
              value={fare}
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.findDriverBtn} disabled={destination.length===0 || pickupLocation.length===0? true: false} onPress={handleRequestRide}>
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

      {/* Modal Overlay for Input */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalLabel}>
                  {modalField === 'pickup'
                    ? 'Pickup Location'
                    : modalField === 'destination'
                    ? 'Destination'
                    : 'Fare'}
                </Text>
                {modalField === 'pickup' ? (
            <>
              <TouchableOpacity
                style={styles.mapPickerButton}
                onPress={async () => {
                  // Get current location
                  let location = await Location.getCurrentPositionAsync({});
                  setPickupLocation(address);
                  setPickupCoords({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                  setModalVisible(false);
                }}
              >
                <Text style={styles.mapPickerText}>📍 Use Current Location</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mapPickerButton}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('MapPicker', {
                    onSelect: (coords, addressText) => {
                      setPickupLocation(addressText);
                      setPickupCoords({
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      });
                      console.log("ClientHomeScreen - Pickup Coords:", pickupCoords)
                    },
                  });
                }}
              >
                <Text style={styles.mapPickerText}>🗺️ Pick location from map</Text>
              </TouchableOpacity>
            </>
          ) : modalField === 'destination' ? (
            <TouchableOpacity
              style={styles.mapPickerButton}
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('MapPicker', {
                  onSelect: (coords, addressText) => {
                    setDestination(addressText);
                    setDestinationRegion({
                      latitude: coords.latitude,
                      longitude: coords.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    });
                    console.log("ClientHomeScreen - Destination Coords:", destinationRegion);
                  },
                });
              }}
            >
              <Text style={styles.mapPickerText}>📍 Pick location from map</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                style={styles.modalInput}
                placeholder={
                  modalField === 'pickup'
                    ? address || 'Current Location'
                    : 'EGP Offer your fare'
                }
                value={modalValue}
                onChangeText={setModalValue}
                keyboardType={modalField === 'fare' ? 'numeric' : 'default'}
                autoFocus
              />
              <TouchableOpacity style={styles.modalButton} onPress={saveModalValue}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </>
          )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
  },
  container: {
    height: height * 0.9,
    width: '100%',
    backgroundColor: '#e6f0ff',
  },
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

  markerContainer: {
  alignItems: 'center',
},

markerText: {
  backgroundColor: '#004080',
  color: 'white',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
  fontSize: 12,
  marginBottom: 4,
  textAlign: 'center',
},

markerDot: {
  width: 10,
  height: 10,
  backgroundColor: '#004080',
  borderRadius: 5,
},

modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  width: '85%',
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 24,
  alignItems: 'center',
},
modalLabel: {
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 12,
  color: '#003366',
},
modalInput: {
  width: '100%',
  borderColor: '#004080',
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 10,
  marginBottom: 18,
  backgroundColor: '#fff',
  height: 44,
  fontSize: 16,
},
modalButton: {
  backgroundColor: '#004080',
  paddingVertical: 12,
  paddingHorizontal: 32,
  borderRadius: 8,
},
modalButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 16,
},

mapPickerButton: {
  backgroundColor: '#cce0ff',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 8,
  marginBottom: 15,
  alignItems: 'center',
  borderColor: '#004080',
  borderWidth: 1,
},

mapPickerText: {
  color: '#004080',
  fontSize: 16,
  fontWeight: 'bold',
},
});

export default ClientHomeScreen;
