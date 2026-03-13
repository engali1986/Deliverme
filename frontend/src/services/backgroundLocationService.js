import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location'; // Changed from expo-background-location
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLog } from '../utils/Logger.js';
import { emitLocation } from './DriverSocket.js';
const LOCATION_TASK_NAME = 'background-location-task';
const DISTANCE_THRESHOLD = 2000; // 2000 meters

const LAST_LOCATION_KEY = 'lastEmittedLocation';

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (v) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Define background task
if(TaskManager && TaskManager.defineTask ){
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  console.log('Background location task triggered with data:', data);

  try {
    const isAvailable = await AsyncStorage.getItem('driverAvailable');
    if (isAvailable !== 'true') {
      console.log('Driver not available, skipping location update');
      return;
    }

    if (!data?.locations?.length) {
      await emitLocation(null);
      return;
    }

    const location = data.locations[0];
    const currentCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };

    const lastLocationRaw = await AsyncStorage.getItem(LAST_LOCATION_KEY);

    // First ever update → emit immediately
    if (!lastLocationRaw) {
      await emitLocation(currentCoords);
      await AsyncStorage.setItem(
        LAST_LOCATION_KEY,
        JSON.stringify(currentCoords)
      );
      return;
    }

    const lastCoords = JSON.parse(lastLocationRaw);

    const distance = getDistanceInMeters(
      lastCoords.latitude,
      lastCoords.longitude,
      currentCoords.latitude,
      currentCoords.longitude
    );

    console.log(`Moved distance: ${distance.toFixed(2)} meters`);

    if (distance >= DISTANCE_THRESHOLD) {
      console.log('Distance threshold reached, emitting location');
      await emitLocation(currentCoords);

      await AsyncStorage.setItem(
        LAST_LOCATION_KEY,
        JSON.stringify(currentCoords)
      );
    } else {
      console.log('No significant movement, sending heartbeat, distance:', distance);
      await emitLocation(null);
    }
  } catch (err) {
    console.error('Error in background location task:', err);
  }

  
});
}else{
  console.warn('TaskManager is not available. Background location tracking will not work.');
}


// Start background location tracking
export async function startBackgroundLocationTracking() {
  console.log('Starting background location tracking...');
  try {
    const isTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
    if (!isTaskDefined) {
      console.error('Location task not defined');
      return false;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      console.log('Background location already tracking');
      return true;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      distanceInterval: DISTANCE_THRESHOLD, // 2000 meters
      timeInterval: 10000, // 10 seconds fallback
      foregroundService: {
        notificationTitle: 'Deliverme Driver Active',
        notificationBody: 'Your location is being tracked for ride requests.',
        notificationColor: '#1565C0',
      },
    }).then((res) => {
      console.log('Location updates started successfully');
      console.log(res);
    }).catch((e) => {
      console.error('Error starting location updates:', e);
    })

    console.log('Background location tracking started');
    return true;
  } catch (e) {
    console.error('Failed to start background location:', e);
    return false;
  }
  
}

// Stop background location tracking
export async function stopBackgroundLocationTracking() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Background location tracking stopped');
    }
  } catch (e) {
    console.error('Failed to stop background location:', e);
  }
}