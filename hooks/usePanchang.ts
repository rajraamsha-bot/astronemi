import { useState, useCallback } from 'react';
import { computePanchang, computeFestivalsForYear, computeMuhurtas, RASHI_NAMES } from '../utils/hindu-calendar-engine';
import { fetchPanchang as fetchProkeralaPanchang } from '@/utils/prokerala-api';
import { DateTime, GeoLocation } from '@/utils/astronomy';
import { Logger } from '@/services/logger';

export interface PanchangData {
  date: string;
  vara: string;
  varaLord: string;
  tithi: string;
  tithiNumber: number;
  paksha: 'Shukla' | 'Krishna';
  nakshatra: string;
  nakshatraLord: string;
  yoga: string;
  yogaType: 'auspicious' | 'inauspicious' | 'neutral';
  karana: string;
  moonRashi: string;
  sunRashi: string;
  sunrise: string;
  sunset: string;
  moonrise: string;
  rahuKaal: string;
  gulikaKaal: string;
  yamaghantaKaal: string;
  abhijitMuhurta: string;
  auspiciousTimings: { name: string; time: string; type: 'good' | 'bad' }[];
  festivals: string[];
}

const AUSPICIOUS_YOGAS = ['Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Dhriti', 'Vriddhi', 'Dhruva', 'Harshana', 'Siddhi', 'Variyan', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra'];
const INAUSPICIOUS_YOGAS = ['Vishkumbha', 'Atiganda', 'Shula', 'Ganda', 'Vyaghata', 'Vajra', 'Vyatipata', 'Parigha', 'Vaidhriti'];

function getVaraLord(vara: string): string {
  const map: Record<string, string> = {
    Sunday: 'Sun', Monday: 'Moon', Tuesday: 'Mars', Wednesday: 'Mercury',
    Thursday: 'Jupiter', Friday: 'Venus', Saturday: 'Saturn',
  };
  return map[vara] || 'Sun';
}

function calculatePanchang(date: Date, lat: number, lon: number): PanchangData {
  const p = computePanchang(date);
  const yearFests = computeFestivalsForYear(date.getFullYear());
  const muhurtas = computeMuhurtas(date, lat, lon);

  const todayFests = yearFests.filter(f =>
    f.date.getDate() === date.getDate() &&
    f.date.getMonth() === date.getMonth() &&
    f.date.getFullYear() === date.getFullYear()
  ).map(f => f.name);

  const formatTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return {
    date: date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    vara: p.varaName.replace('vara', 'day'),
    varaLord: ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'][p.vara] || 'Sun',
    tithi: p.tithiName,
    tithiNumber: p.tithi,
    paksha: p.paksha as 'Shukla' | 'Krishna',
    nakshatra: p.nakshatraName,
    nakshatraLord: ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'][p.nakshatra % 9] || 'Sun',
    yoga: p.yogaName,
    yogaType: AUSPICIOUS_YOGAS.includes(p.yogaName) ? 'auspicious' : INAUSPICIOUS_YOGAS.includes(p.yogaName) ? 'inauspicious' : 'neutral',
    karana: p.karanaName,
    moonRashi: RASHI_NAMES[Math.floor((p.moonLongitude ?? 0) / 30)] || 'Mesha',
    sunRashi: RASHI_NAMES[Math.floor((p.sunLongitude ?? 0) / 30)] || 'Mesha',
    sunrise: formatTime(muhurtas.sunrise),
    sunset: formatTime(muhurtas.sunset),
    moonrise: formatTime(new Date(muhurtas.sunset.getTime() + 3600000)),
    rahuKaal: `${formatTime(muhurtas.rahuKaal[0])} – ${formatTime(muhurtas.rahuKaal[1])}`,
    gulikaKaal: `${formatTime(muhurtas.gulikaKaal[0])} – ${formatTime(muhurtas.gulikaKaal[1])}`,
    yamaghantaKaal: `${formatTime(muhurtas.yamaghanta[0])} – ${formatTime(muhurtas.yamaghanta[1])}`,
    abhijitMuhurta: `${formatTime(muhurtas.abhijit[0])} – ${formatTime(muhurtas.abhijit[1])}`,
    auspiciousTimings: [
      { name: 'Brahma Muhurta', time: `${formatTime(muhurtas.brahma[0])} – ${formatTime(muhurtas.brahma[1])}`, type: 'good' as const },
      { name: 'Abhijit Muhurta', time: `${formatTime(muhurtas.abhijit[0])} – ${formatTime(muhurtas.abhijit[1])}`, type: 'good' as const },
      { name: 'Rahu Kaal', time: `${formatTime(muhurtas.rahuKaal[0])} – ${formatTime(muhurtas.rahuKaal[1])}`, type: 'bad' as const },
      { name: 'Yamaghanta', time: `${formatTime(muhurtas.yamaghanta[0])} – ${formatTime(muhurtas.yamaghanta[1])}`, type: 'bad' as const },
    ],
    festivals: todayFests,
  };
}

export const usePanchang = (location: GeoLocation) => {
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'prokerala' | 'local'>('local');

  const loadPanchang = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const base = calculatePanchang(date, location.latitude, location.longitude);
      const dt: DateTime = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: 0, minute: 0, second: 0,
      };

      const api = await fetchProkeralaPanchang(dt, location);
      if (api) {
        const vara = api.vara || base.vara;
        const yoga = api.yoga || base.yoga;
        setPanchang({
          ...base,
          vara: String(vara),
          varaLord: getVaraLord(String(vara)) || base.varaLord,
          tithi: api.tithi || base.tithi,
          nakshatra: api.nakshatra || base.nakshatra,
          yoga: String(yoga),
          yogaType: AUSPICIOUS_YOGAS.includes(String(yoga)) ? 'auspicious' : INAUSPICIOUS_YOGAS.includes(String(yoga)) ? 'inauspicious' : 'neutral',
          karana: api.karana || base.karana,
          moonRashi: base.moonRashi,
          sunRashi: base.sunRashi,
          sunrise: api.sunrise ? new Date(api.sunrise).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : base.sunrise,
          sunset: api.sunset ? new Date(api.sunset).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : base.sunset,
          moonrise: api.moonrise ? new Date(api.moonrise).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : base.moonrise,
          rahuKaal: String(api.rahuKalam || base.rahuKaal),
          gulikaKaal: String(api.gulikaKalam || base.gulikaKaal),
          yamaghantaKaal: String(api.yamaghantaKalam || base.yamaghantaKaal),
        });
        setDataSource('prokerala');
      } else {
        setPanchang(base);
        setDataSource('local');
      }
    } catch (error) {
      Logger.error('Panchang load error:', error);
    } finally {
      setLoading(false);
    }
  }, [location]);

  return { panchang, loading, dataSource, loadPanchang };
};
