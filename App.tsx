import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  PermissionsAndroid, 
  Platform, 
  ActivityIndicator, 
  Alert,
  Linking,
  AppState,
  AppStateStatus
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@saved_path';
type Position = {
  latitude: number;
  longitude: number;
};
export default function App() {
    const [path, setPath] = useState<Position[]>([]);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied' | 'error'>('checking');
  const watchId = useRef<number | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkAndRequestPermissions();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);


    initializeApp();
    return () => {
      subscription?.remove();
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      setPermissionStatus('checking');
      const granted = await checkAndRequestPermissions();
      
      if (granted) {
        setPermissionStatus('granted');
        await loadSavedPath();
        getInitialLocation();
        startLocationUpdates();
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Initialization error:', error);
      setPermissionStatus('error');
    }
  };

  const checkAndRequestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      return await requestAndroidPermissions();
    } else {
      return await requestIOSPermissions();
    }
  };

  const requestAndroidPermissions = async (): Promise<boolean> => {
    try {
      const fineLocationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      if (!fineLocationGranted) {
        const fineLocationResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message: 'This app needs access to your location to track your path.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (fineLocationResult !== PermissionsAndroid.RESULTS.GRANTED) {
          showPermissionDeniedAlert();
          return false;
        }
      }

  if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 29) {
        const backgroundLocationGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );

        if (!backgroundLocationGranted) {
          Alert.alert(
            'Background Location Permission',
            'To continue tracking your path when the app is in the background, please grant "Allow all the time" location permission in the next screen.',
            [
              {
                text: 'Cancel',
                onPress: () => {},
                style: 'cancel',
              },
              {
                text: 'Continue',
                onPress: async () => {
                  const backgroundResult = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
                    {
                      title: 'Background Location Permission',
                      message: 'Allow this app to access location in the background for continuous path tracking.',
                      buttonNeutral: 'Ask Me Later',
                      buttonNegative: 'Cancel',
                      buttonPositive: 'OK',
                    }
                  );

                  if (backgroundResult !== PermissionsAndroid.RESULTS.GRANTED) {
                    Alert.alert(
                      'Limited Functionality',
                      'Without background location permission, the app will only track your path when it\'s open.',
                      [{ text: 'OK' }]
                    );
                  }
                },
              },
            ]
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Android permission error:', error);
      return false;
    }
  };

  const requestIOSPermissions = async (): Promise<boolean> => {
  try {
    const result = await Geolocation.requestAuthorization('always') as
      | 'granted'
      | 'whenInUse'
      | 'always'
      | 'denied'
      | 'disabled'
      | 'restricted';

    console.log('iOS permission result:', result);

    if (result === 'granted' || result === 'whenInUse' || result === 'always') {
      return true;
    } else {
      showPermissionDeniedAlert();
      return false;
    }
  } catch (error) {
    console.error('iOS permission error:', error);
    return false;
  }
};


  const showPermissionDeniedAlert = () => {
    Alert.alert(
      'Location Permission Required',
      'This app needs location permission to track your path. Please enable location services in your device settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
        {
          text: 'Retry',
          onPress: () => {
            initializeApp();
          },
        },
      ]
    );
  };

  const getInitialLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        if (position?.coords) {
          const { latitude, longitude } = position.coords;
          const newPoint = { latitude, longitude };
          setCurrentPosition(newPoint);
          setPath((prevPath) => {
            const updatedPath = [...prevPath, newPoint];
            savePath(updatedPath);
            return updatedPath;
          });
        }
      },
      (error) => {
        console.error('Initial location error:', error);
        handleLocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
        distanceFilter: 0,
      }
    );
  };

  const handleLocationError = (error: any) => {
    console.error('Location error:', error);
    
    let errorMessage = 'Unable to get your location.';
    
    switch (error.code) {
      case 1: 
        errorMessage = 'Location permission denied. Please enable location services.';
        break;
      case 2: 
        errorMessage = 'Location information is unavailable.';
        break;
      case 3: 
        errorMessage = 'Location request timed out.';
        break;
      default:
        errorMessage = 'An unknown error occurred while getting location.';
    }

    Alert.alert('Location Error', errorMessage, [
      {
        text: 'Retry',
        onPress: () => getInitialLocation(),
      },
      {
        text: 'OK',
      },
    ]);
  };

  const loadSavedPath = async () => {
    try {
      const savedPath = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedPath) {
        setPath(JSON.parse(savedPath));
      }
    } catch (error) {
      console.error('Error loading saved path:', error);
    }
  };

  const savePath = async (newPath: any[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPath));
    } catch (error) {
      console.error('Error saving path:', error);
    }
  };

  const startLocationUpdates = () => {
    try {
      watchId.current = Geolocation.watchPosition(
        (position) => {
          if (!position?.coords) return;

          const { latitude, longitude } = position.coords;
          const newPoint = { latitude, longitude };

          setCurrentPosition(newPoint);
          setPath((prevPath) => {
            const updatedPath = [...prevPath, newPoint];
            savePath(updatedPath);
            return updatedPath;
          });
        },
        (error) => {
          handleLocationError(error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 5000,
          fastestInterval: 2000,
          forceRequestLocation: true,
          forceLocationManager: Platform.OS === 'android',
          showLocationDialog: true,
          useSignificantChanges: false,
        }
      );
    } catch (error) {
      console.error('watchPosition error:', error);
      Alert.alert('Error', 'Failed to start location tracking.');
    }
  };


  if (permissionStatus === 'checking') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }


  if (permissionStatus === 'denied' || permissionStatus === 'error') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="red" />
      </View>
    );
  }


  if (!currentPosition) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        region={{
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton
      >
        {path.length > 0 && (
          <Polyline 
            coordinates={path} 
            strokeWidth={5} 
            strokeColor="blue"
            lineJoin="round"
            lineCap="round"
          />
        )}
        {currentPosition && (
          <Marker 
            coordinate={currentPosition} 
            title="Current Position"
            pinColor="red"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});