import { database } from '../config/firebase';
import { ref, set, update, remove, onValue, off } from 'firebase/database';

export interface SharedLocationData {
  tripId: string;
  timestamp: string;
  currentLocation: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  destination: {
    lat: number;
    lng: number;
    address: string;
  };
  route?: {
    totalDistance: number;
    remainingDistance: number;
    estimatedDuration: number;
    remainingDuration: number;
  };
  status: 'started' | 'en_route' | 'arrived' | 'stopped';
  speed?: number;
  heading?: number;
  userInfo?: {
    name?: string;
    phone?: string;
  };
}

export class LocationSharingService {
  private static instance: LocationSharingService;
  private currentTripId: string | null = null;
  private isSharing = false;

  static getInstance(): LocationSharingService {
    if (!LocationSharingService.instance) {
      LocationSharingService.instance = new LocationSharingService();
    }
    return LocationSharingService.instance;
  }

  // Generate unique trip ID
  generateTripId(): string {
    return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Start sharing location
  async startSharing(destination: { lat: number; lng: number; address: string }): Promise<string> {
    this.currentTripId = this.generateTripId();
    this.isSharing = true;

    const tripData: Partial<SharedLocationData> = {
      tripId: this.currentTripId,
      timestamp: new Date().toISOString(),
      destination,
      status: 'started',
    };

    await set(ref(database, `trips/${this.currentTripId}`), tripData);
    return this.currentTripId;
  }

  // Update location during navigation
  async updateLocation(locationData: Partial<SharedLocationData>): Promise<void> {
    if (!this.currentTripId || !this.isSharing) {
      console.log('❌ Cannot update location - no trip ID or not sharing');
      return;
    }

    const updateData = {
      ...locationData,
      timestamp: new Date().toISOString(),
      tripId: this.currentTripId,
    };

    console.log('📡 Writing to Firebase:', `trips/${this.currentTripId}`, updateData);
    
    try {
      await update(ref(database, `trips/${this.currentTripId}`), updateData);
      console.log('✅ Firebase update successful');
    } catch (error) {
      console.error('🚨 Firebase update error:', error);
      throw error;
    }
  }

  // Stop sharing
  async stopSharing(): Promise<void> {
    if (!this.currentTripId) return;

    await update(ref(database, `trips/${this.currentTripId}`), {
      status: 'stopped',
      timestamp: new Date().toISOString(),
    });

    // Remove trip data after 1 hour
    setTimeout(async () => {
      if (this.currentTripId) {
        await remove(ref(database, `trips/${this.currentTripId}`));
      }
    }, 60 * 60 * 1000);

    this.currentTripId = null;
    this.isSharing = false;
  }

  // Get sharing status
  getIsSharing(): boolean {
    return this.isSharing;
  }

  getCurrentTripId(): string | null {
    return this.currentTripId;
  }

  // Generate shareable link
  generateShareLink(tripId: string): string {
    // For local testing
    return `http://localhost:3000/track/${tripId}`;
  }

  // Listen to trip updates (for web viewer)
  subscribeToTrip(tripId: string, callback: (data: SharedLocationData | null) => void): () => void {
    const tripRef = ref(database, `trips/${tripId}`);
    
    onValue(tripRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    });

    // Return unsubscribe function
    return () => off(tripRef);
  }

  // Calculate ETA and distance
  calculateRouteProgress(
    currentLat: number,
    currentLng: number,
    destLat: number,
    destLng: number,
    totalDistance: number
  ): { remainingDistance: number; progress: number } {
    const R = 6371; // Earth's radius in km
    const dLat = (destLat - currentLat) * Math.PI / 180;
    const dLng = (destLng - currentLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(currentLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const remainingDistance = R * c * 1000; // Convert to meters

    const progress = Math.max(0, Math.min(100, ((totalDistance - remainingDistance) / totalDistance) * 100));

    return { remainingDistance, progress };
  }
}