import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location'; // Changed from expo-background-location
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateDriverLocation } from './api.js';

const LOCATION_TASK_NAME = 'background-location-task';
const DISTANCE_THRESHOLD = 100; // 100 meters

// Define background task
if(TaskManager && TaskManager.defineTask ){
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {
      try {
        const isAvailable = await AsyncStorage.getItem('driverAvailable');
        if (isAvailable !== 'true') {
          console.log('Driver not available, skipping location update');
          return;
        }

        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        };

        console.log('Background task: location update', coords);

        // Send to backend
        // const result = await updateDriverLocation(coords);
        // if (!result) {
        //   console.warn('Location update failed');
        // }
      } catch (e) {
        console.error('Background location update error:', e);
      }
    }
  }
});
}else{
  console.warn('TaskManager is not available. Background location tracking will not work.');
}


// Start background location tracking
export async function startBackgroundLocationTracking() {
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
      distanceInterval: DISTANCE_THRESHOLD, // 100 meters
      timeInterval: 10000, // 10 seconds fallback
      foregroundService: {
        notificationTitle: 'Deliverme Driver Active',
        notificationBody: 'Your location is being tracked for ride requests.',
        notificationColor: '#1565C0',
      },
    });

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