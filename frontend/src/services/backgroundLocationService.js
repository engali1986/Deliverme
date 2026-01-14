import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location'; // Changed from expo-background-location
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLog } from '../utils/Logger.js';
import { emitLocation } from './DriverSocket.js';
const LOCATION_TASK_NAME = 'background-location-task';
const DISTANCE_THRESHOLD = 500; // 500 meters

// Define background task
if(TaskManager && TaskManager.defineTask ){
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  try {
    if (data) {
    const { locations } = data;
    
    const isAvailable = await AsyncStorage.getItem('driverAvailable');
    if (isAvailable !== 'true') {
      console.log('Driver not available, skipping location update');
      return;
    }
    let locationUpdated=false

    if (locations && locations.length > 0) {
      const location = locations[0];
       if (location) {
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        };

        console.log('Background task: location update', coords);
        addLog(`Background location update: ${JSON.stringify(coords)}`, 'info');
        // Emit location via socket
        await emitLocation(coords);
        locationUpdated=true         
      }

    }

    // 🔁 Heartbeat fallback (no movement)
    if (!locationUpdated) {
      await emitLocation(null);
    }

  }
    
  } catch (error) {
    console.error('Error in background location task:', error); 

    
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
      distanceInterval: DISTANCE_THRESHOLD, // 100 meters
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