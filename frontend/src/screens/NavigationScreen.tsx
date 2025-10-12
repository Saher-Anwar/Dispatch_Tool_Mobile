import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Share } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import Mapbox, { MapView, Camera, UserLocation, ShapeSource, LineLayer } from '@rnmapbox/maps';
import mapboxClient from '@mapbox/mapbox-sdk';
import mapboxDirections from '@mapbox/mapbox-sdk/services/directions';
import { LocationSharingService } from '../services/locationSharingService';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

interface RouteParams {
  destination?: {
    coordinates: [number, number];
    address: string;
  };
}

export const NavigationScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { destination } = (route.params as RouteParams) || {};
  
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const directionsClient = mapboxDirections(mapboxClient({ accessToken: MAPBOX_ACCESS_TOKEN }));
  const locationSharingService = LocationSharingService.getInstance();

  useEffect(() => {
    const initLocation = async () => {
      await requestLocationPermission();
    };
    initLocation();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    const calcRoute = async () => {
      if (currentLocation && destination && permissionGranted) {
        await calculateRoute();
      }
    };
    calcRoute();
  }, [currentLocation, destination, permissionGranted]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setPermissionGranted(true);
        getCurrentLocation();
      } else {
        Alert.alert('Permission Denied', 'Location permission is required for navigation.');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission.');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation([location.coords.longitude, location.coords.latitude]);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location.');
    }
  };

  const calculateRoute = async () => {
    if (!currentLocation || !destination) return;

    try {
      const response = await directionsClient
        .getDirections({
          profile: 'driving',
          waypoints: [
            { coordinates: currentLocation },
            { coordinates: destination.coordinates },
          ],
          geometries: 'geojson',
          overview: 'full',
        })
        .send();

      if (response.body.routes && response.body.routes.length > 0) {
        const route = response.body.routes[0];
        setRouteData({
          type: 'Feature',
          geometry: route.geometry,
        });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      Alert.alert('Error', 'Failed to calculate route.');
    }
  };

  const startNavigation = async () => {
    if (!permissionGranted) {
      Alert.alert('Permission Required', 'Location permission is required to start navigation.');
      return;
    }

    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (location) => {
          const newLocation: [number, number] = [location.coords.longitude, location.coords.latitude];
          setCurrentLocation(newLocation);
          
          // Update shared location if sharing is active
          if (isSharing && destination) {
            updateSharedLocation(newLocation, location.coords.speed || 0, location.coords.heading || 0);
          }
        }
      );
      setIsNavigating(true);
      Alert.alert('Navigation Started', 'Real-time location tracking is now active.');
    } catch (error) {
      console.error('Error starting navigation:', error);
      Alert.alert('Error', 'Failed to start navigation.');
    }
  };

  const stopNavigation = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsNavigating(false);
    
    // Stop sharing if active
    if (isSharing) {
      stopLocationSharing();
    }
    
    Alert.alert('Navigation Stopped', 'Location tracking has been stopped.');
  };

  const startLocationSharing = async () => {
    console.log('🔵 Starting location sharing...');
    console.log('📍 Current location:', currentLocation);
    console.log('🎯 Destination:', destination);
    
    if (!destination || !currentLocation) {
      Alert.alert('Error', 'Current location not available. Please wait for GPS to initialize.');
      return;
    }

    try {
      console.log('🔥 Creating trip in Firebase...');
      const tripId = await locationSharingService.startSharing({
        lat: destination.coordinates[1],
        lng: destination.coordinates[0],
        address: destination.address,
      });
      console.log('✅ Trip created with ID:', tripId);

      // Immediately add current location to the trip data
      console.log('📡 Updating location data...');
      await locationSharingService.updateLocation({
        currentLocation: {
          lat: currentLocation[1],
          lng: currentLocation[0],
          accuracy: 5,
        },
        destination: {
          lat: destination.coordinates[1],
          lng: destination.coordinates[0],
          address: destination.address,
        },
        status: 'en_route',
        speed: 0,
        heading: 0,
      });
      console.log('✅ Location data updated');

      const link = locationSharingService.generateShareLink(tripId);
      setShareLink(link);
      setIsSharing(true);

      console.log('🔗 Generated share link:', link);

      // Share the link
      await Share.share({
        message: `Track my location in real-time: ${link}`,
        title: 'Live Location Sharing',
      });

    } catch (error) {
      console.error('🚨 Error starting location sharing:', error);
      Alert.alert('Error', 'Failed to start location sharing');
    }
  };

  const stopLocationSharing = async () => {
    try {
      await locationSharingService.stopSharing();
      setIsSharing(false);
      setShareLink(null);
      Alert.alert('Sharing Stopped', 'Location sharing has been stopped.');
    } catch (error) {
      console.error('Error stopping location sharing:', error);
    }
  };

  const updateSharedLocation = async (location: [number, number], speed: number, heading: number) => {
    if (!destination || !routeData) return;

    try {
      // Calculate remaining distance and ETA
      const { remainingDistance, progress } = locationSharingService.calculateRouteProgress(
        location[1], // lat
        location[0], // lng
        destination.coordinates[1], // dest lat
        destination.coordinates[0], // dest lng
        routeData.geometry?.coordinates?.length ? 
          routeData.geometry.coordinates.length * 100 : 1000 // estimated total distance
      );

      const estimatedTimeRemaining = speed > 0 ? (remainingDistance / (speed * 0.44704)) : 0; // Convert mph to m/s

      await locationSharingService.updateLocation({
        currentLocation: {
          lat: location[1],
          lng: location[0],
          accuracy: 5,
        },
        route: {
          totalDistance: routeData.geometry?.coordinates?.length ? 
            routeData.geometry.coordinates.length * 100 : 1000,
          remainingDistance,
          estimatedDuration: 0, // Would need route API for this
          remainingDuration: estimatedTimeRemaining,
        },
        status: 'en_route',
        speed,
        heading,
      });
    } catch (error) {
      console.error('Error updating shared location:', error);
    }
  };

  if (!permissionGranted) {
    return (
      <View className={styles.centerContainer}>
        <Text className={styles.permissionText}>Location permission is required for navigation.</Text>
        <TouchableOpacity className={styles.button} onPress={requestLocationPermission}>
          <Text className={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!destination) {
    return (
      <View className={styles.centerContainer}>
        <Text className={styles.noDestinationText}>No destination selected.</Text>
        <TouchableOpacity 
          className={styles.button} 
          onPress={() => navigation.goBack()}
        >
          <Text className={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className={styles.container}>
      <MapView 
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/navigation-day-v1"
      >
        <Camera
          centerCoordinate={currentLocation || destination.coordinates}
          zoomLevel={14}
          followUserLocation={isNavigating}
          followUserMode={'normal' as any}
        />
        
        <UserLocation
          visible={true}
          showsUserHeadingIndicator={true}
        />

        {routeData && (
          <ShapeSource id="routeSource" shape={routeData}>
            <LineLayer
              id="routeLayer"
              style={{
                lineColor: '#1976D2',
                lineWidth: 5,
                lineOpacity: 0.8,
              }}
            />
          </ShapeSource>
        )}
      </MapView>

      <View className={styles.destinationInfo}>
        <Text className={styles.destinationTitle}>Destination:</Text>
        <Text className={styles.destinationAddress}>{destination.address}</Text>
      </View>

      <View className={styles.controls}>
        {!isNavigating ? (
          <TouchableOpacity 
            className={styles.startButton}
            onPress={startNavigation}
          >
            <Text className={styles.buttonText}>Start Navigation</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            className={styles.stopButton}
            onPress={stopNavigation}
          >
            <Text className={styles.buttonText}>Stop Navigation</Text>
          </TouchableOpacity>
        )}
        
        {/* Location Sharing Controls */}
        <View className={styles.sharingControls}>
          {!isSharing ? (
            <TouchableOpacity 
              className={styles.shareButton}
              onPress={startLocationSharing}
            >
              <Text className={styles.buttonText}>Share Location</Text>
            </TouchableOpacity>
          ) : (
            <View className={styles.sharingActive}>
              <TouchableOpacity 
                className={styles.stopShareButton}
                onPress={stopLocationSharing}
              >
                <Text className={styles.buttonText}>Stop Sharing</Text>
              </TouchableOpacity>
              {shareLink && (
                <TouchableOpacity 
                  className={styles.shareAgainButton}
                  onPress={() => Share.share({
                    message: `Track my location: ${shareLink}`,
                    title: 'Live Location'
                  })}
                >
                  <Text className={styles.buttonText}>Share Link Again</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = {
  container: `flex-1`,
  centerContainer: `flex-1 items-center justify-center bg-white p-6`,
  permissionText: `text-lg text-gray-700 text-center mb-4`,
  noDestinationText: `text-lg text-gray-700 text-center mb-4`,
  destinationInfo: `absolute top-12 left-4 right-4 bg-white p-4 rounded-lg shadow-md z-10`,
  destinationTitle: `text-sm font-medium text-gray-600`,
  destinationAddress: `text-base font-semibold text-gray-800 mt-1`,
  controls: `absolute bottom-8 left-4 right-4 z-10`,
  button: `bg-blue-600 py-3 px-6 rounded-lg`,
  startButton: `bg-green-600 py-4 px-6 rounded-lg mb-3`,
  stopButton: `bg-red-600 py-4 px-6 rounded-lg mb-3`,
  sharingControls: `mt-2`,
  shareButton: `bg-blue-600 py-3 px-6 rounded-lg`,
  sharingActive: `flex-row gap-2`,
  stopShareButton: `bg-orange-600 py-3 px-4 rounded-lg flex-1`,
  shareAgainButton: `bg-blue-500 py-3 px-4 rounded-lg flex-1`,
  buttonText: `text-white text-center font-semibold text-base`,
};