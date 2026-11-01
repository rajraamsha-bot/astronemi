import { notificationService } from './notifications';
import { calculateTransitPositions } from './transit-engine';
import { Logger } from '@/services/logger';

const MAJOR_PLANETS = ['Saturn', 'Jupiter', 'Mars', 'Rahu', 'Ketu'];

interface TransitEvent {
  planet: string;
  previousSign: string;
  newSign: string;
  date: Date;
  isRetrogradeChange: boolean; // true if went retro or direct
  direction: 'retrograde' | 'direct';
}

/**
 * Identify transit events for the upcoming days and schedule notifications.
 */
export async function scheduleTransitEvents(daysAhead: number = 30): Promise<void> {
  try {
    const events = calculateUpcomingTransitEvents(daysAhead);

    for (const event of events) {
      if (event.isRetrogradeChange) {
        await notificationService.scheduleNotification({
          title: `Astrology Alert: ${event.planet} turns ${event.direction}`,
          body: `${event.planet} goes ${event.direction} in ${event.newSign} today. Tap to see how it affects your chart!`,
          data: { type: 'transit_retrograde', planet: event.planet },
        }, Math.floor((event.date.getTime() - Date.now()) / 1000));
      } else {
        await notificationService.scheduleNotification({
          title: `Major Transit: ${event.planet} enters ${event.newSign}`,
          body: `${event.planet} has moved from ${event.previousSign} into ${event.newSign}. Explore the impact on your life.`,
          data: { type: 'transit_sign_change', planet: event.planet, sign: event.newSign },
        }, Math.floor((event.date.getTime() - Date.now()) / 1000));
      }
    }
  } catch (error) {
    Logger.error('Error scheduling transit notifications:', error);
  }
}

/**
 * Calculates upcoming sign changes and retrogression shifts 
 * (approximate daily scan)
 */
function calculateUpcomingTransitEvents(days: number): TransitEvent[] {
  const events: TransitEvent[] = [];
  const now = new Date();
  
  let previousPositions = getDetailedPositions(now);

  for (let i = 1; i <= days; i++) {
    const futureDate = new Date(now.getTime() + i * 86400000);
    const currentPositions = getDetailedPositions(futureDate);

    for (const p of currentPositions) {
      const prev = previousPositions.find(p2 => p2.planet === p.planet);
      if (!prev) continue;

      // 1. Check for Sign Change
      if (p.sign !== prev.sign && MAJOR_PLANETS.includes(p.planet)) {
        events.push({
          planet: p.planet,
          previousSign: prev.sign,
          newSign: p.sign,
          date: new Date(futureDate),
          isRetrogradeChange: false,
          direction: p.isRetrograde ? 'retrograde' : 'direct'
        });
      }

      // 2. Check for Retrogression Change (especially Mercury, Mars, Jupiter, Saturn)
      if (p.isRetrograde !== prev.isRetrograde && p.planet !== 'Sun' && p.planet !== 'Moon') {
        events.push({
          planet: p.planet,
          previousSign: prev.sign,
          newSign: p.sign,
          date: new Date(futureDate),
          isRetrogradeChange: true,
          direction: p.isRetrograde ? 'retrograde' : 'direct'
        });
      }
    }

    previousPositions = currentPositions;
  }

  return events;
}

function getDetailedPositions(date: Date) {
  return calculateTransitPositions(date);
}

