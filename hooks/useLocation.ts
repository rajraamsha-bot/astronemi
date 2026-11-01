import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { geocodeCity } from '@/utils/jaimini-engine';
import { GeoLocation } from '@/utils/astronomy';
import { Logger } from '@/services/logger';

interface UseLocationResult {
  location: GeoLocation;
  locationLabel: string;
  resolveLocation: () => Promise<void>;
  isLoading: boolean;
}

export const useLocation = (): UseLocationResult => {
  const [location, setLocation] = useState<GeoLocation>({ 
    latitude: 28.6139, 
    longitude: 77.2090, 
    timezone: 5.5 
  });
  const [locationLabel, setLocationLabel] = useState('New Delhi, India');
  const [isLoading, setIsLoading] = useState(false);

  const resolveLocation = useCallback(async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const fallback = await geocodeCity('New Delhi');
        setLocation({ 
          latitude: fallback.latitude, 
          longitude: fallback.longitude, 
          timezone: fallback.timezone 
        });
        setLocationLabel(fallback.displayName);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({});
      const tz = -new Date().getTimezoneOffset() / 60;
      
      const [place] = await Location.reverseGeocodeAsync({ 
        latitude: pos.coords.latitude, 
        longitude: pos.coords.longitude 
      });
      
      const label = [place?.city, place?.region, place?.country].filter(Boolean).join(', ');
      
      setLocation({ 
        latitude: pos.coords.latitude, 
        longitude: pos.coords.longitude, 
        timezone: tz 
      });
      setLocationLabel(label || 'Current Location');
    } catch (error) {
      Logger.error('Location resolution error:', error);
      // Fallback with nested error handling
      try {
        const fallback = await geocodeCity('New Delhi');
        setLocation({
          latitude: fallback.latitude,
          longitude: fallback.longitude,
          timezone: fallback.timezone
        });
        setLocationLabel(fallback.displayName);
      } catch (fallbackError) {
        Logger.error('Fallback geocoding failed:', fallbackError);
        // Use hardcoded New Delhi defaults
        setLocation({ latitude: 28.6139, longitude: 77.2090, timezone: 5.5 });
        setLocationLabel('New Delhi, India');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { location, locationLabel, resolveLocation, isLoading };
};
