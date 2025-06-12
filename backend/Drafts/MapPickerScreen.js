import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const MapPickerScreen = ({ route, navigation }) => {
  const { onSelect } = route.params;
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setLoading(false);
    })();
  }, []);

  const handleSelect = async (coord) => {
    if (loading) return; // Prevent multiple triggers
    setLoading(true);
    setLocation({
      latitude: coord.latitude,
      longitude: coord.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    let [place] = await Location.reverseGeocodeAsync(coord);
    const fullAddress = `${place?.name || ''} ${place?.street || ''} ${place?.city || ''}`.trim();
    setLoading(false);
    onSelect(coord, fullAddress);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={location}
          onPress={(e) => handleSelect(e.nativeEvent.coordinate)}
        >
          <Marker coordinate={location} />
        </MapView>
      ) : (
        <ActivityIndicator size="large" color="#004080" />
      )}
      <Text style={styles.instruction}>Tap anywhere to select a location</Text>
      {loading && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
          <ActivityIndicator size="large" color="#004080" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  instruction: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#004080',
    color: '#fff',
    padding: 10,
    borderRadius: 10,
  },
});

export default MapPickerScreen;