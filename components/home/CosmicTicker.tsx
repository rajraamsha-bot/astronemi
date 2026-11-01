import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { 
  calculateJulianDay, 
  calculateJulianCentury,
  calculateSunPosition,
  calculateMoonPosition,
  calculateMercuryPosition,
  calculateVenusPosition,
  calculateMarsPosition,
  calculateJupiterPosition,
  calculateSaturnPosition,
  calculateRahuKetuPosition,
  DateTime
} from '@/utils/astronomy';
import { tropicalToSidereal } from '@/utils/vedic-astrology';



const PLANETS = [
  { name: 'Sun', en: 'Sun', emoji: '☀️', color: '#FFB341' },
  { name: 'Moon', en: 'Moon', emoji: '🌙', color: '#E5E5EA' },
  { name: 'Mars', en: 'Mars', emoji: '🔴', color: '#FF5722' },
  { name: 'Mercury', en: 'Merc', emoji: '☿', color: '#4CAF50' },
  { name: 'Jupiter', en: 'Jup', emoji: '♃', color: '#FFD700' },
  { name: 'Venus', en: 'Ven', emoji: '♀', color: '#F48FB1' },
  { name: 'Saturn', en: 'Sat', emoji: '♄', color: '#90CAF9' },
  { name: 'Rahu', en: 'Rah', emoji: '☊', color: '#9C27B0' },
  { name: 'Ketu', en: 'Ket', emoji: '☋', color: '#795548' },
];

const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const CosmicTicker = () => {
  const Colors = useAppTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const scrollX = useRef(new Animated.Value(0)).current;

  // 1. Calculate current astronomical state
  const tickerData = useMemo(() => {
    const now = new Date();
    const dt: DateTime = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
    };
    
    // Approximate local timezone
    const timezone = -now.getTimezoneOffset() / 60;
    const jd = calculateJulianDay(dt, timezone);
    const T = calculateJulianCentury(jd);

    const positions = [
      calculateSunPosition(T),
      calculateMoonPosition(T),
      calculateMarsPosition(T),
      calculateMercuryPosition(T),
      calculateJupiterPosition(T),
      calculateVenusPosition(T),
      calculateSaturnPosition(T),
      { longitude: calculateRahuKetuPosition(T).rahu },
      { longitude: calculateRahuKetuPosition(T).ketu },
    ];

    return PLANETS.map((planet, i) => {
      const pos = positions[i];
      const sidereal = pos ? tropicalToSidereal(pos.longitude as number, jd) : 0;
      const signIndex = Math.floor(sidereal / 30);
      return {
        ...planet,
        sign: SIGN_NAMES[signIndex] || 'Aries',
      };
    });
  }, []);

  // 2. Setup continuous animation
  useEffect(() => {
    let isMounted = true;
    let animation: Animated.CompositeAnimation | null = null;

    const runAnimation = () => {
      if (!isMounted) return;
      scrollX.setValue(0);
      animation = Animated.timing(scrollX, {
        toValue: -1000, // Large enough to clear items
        duration: 30000, // Slow, premium scroll
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animation.start(() => runAnimation());
    };

    runAnimation();

    return () => {
      isMounted = false;
      animation?.stop();
    };
  }, [scrollX]);

  // Duplicate items for seamless loop
  const items = [...tickerData, ...tickerData, ...tickerData];

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.labelText}>COSMIC TICKER</Text>
        <View style={styles.liveIndicator} />
      </View>
      <Animated.View 
        style={[
          styles.tickerTrack,
          { transform: [{ translateX: scrollX }] }
        ]}
      >
        {items.map((item, i) => (
          <View key={`${item.name}-${i}`} style={styles.item}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.name}>{item.en}</Text>
            <Text style={[styles.sign, { color: item.color }]}>{item.sign}</Text>
            <View style={styles.dot} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  container: {
    height: 48,
    backgroundColor: Colors.darkBg || '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  labelContainer: {
    paddingHorizontal: 12,
    backgroundColor: Colors.darkBg || '#0F172A',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  labelText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    opacity: 0.7,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981', // Emerald-500
  },
  tickerTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emoji: {
    fontSize: 14,
    marginRight: 6,
  },
  name: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
    textTransform: 'uppercase',
  },
  sign: {
    fontSize: 12,
    fontWeight: '800',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 16,
  },
});
