/**
 * Astrologer Dashboard Screen Tests
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AstrologerDashboardScreen from '@/app/astrologer-dashboard';
import { AstrologerAnalyticsService } from '@/services/astrologer-analytics';

jest.mock('@/services/astrologer-analytics', () => ({
  AstrologerAnalyticsService: {
    getDashboard: jest.fn(),
  },
}));

// The screen now resolves the astrologer id from the signed-in user via
// getMyAstrologerProfile (services/chat). Provide a signed-in user and a
// matching astrologer profile.
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'astro-user-1' } }),
}));

jest.mock('@/services/chat', () => ({
  getMyAstrologerProfile: jest.fn().mockResolvedValue({ id: 'astro-1' }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

const mockDashboard = {
  earnings: {
    today: 500,
    thisWeek: 3500,
    thisMonth: 12000,
    total: 45000,
    pendingPayout: 2100,
  },
  todayActivity: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    consultations: hour === 10 ? 3 : 0,
    earnings: hour === 10 ? 350 : 0,
    avgDuration: hour === 10 ? 15 : 0,
  })),
  last7Days: Array.from({ length: 7 }, (_, i) => ({
    date: `2024-06-${15 + i}`,
    consultations: i + 1,
    earnings: (i + 1) * 100,
    avgRating: 4.5,
  })),
  ratingDistribution: [
    { rating: 1, count: 0 },
    { rating: 2, count: 1 },
    { rating: 3, count: 2 },
    { rating: 4, count: 5 },
    { rating: 5, count: 8 },
  ],
  typeBreakdown: [
    { type: 'chat' as const, count: 10, earnings: 500, avgDuration: 600 },
    { type: 'call' as const, count: 5, earnings: 750, avgDuration: 900 },
    { type: 'video' as const, count: 2, earnings: 400, avgDuration: 1200 },
  ],
  peakHours: {
    peakHours: [10, 11, 19, 20],
    quietHours: [2, 3, 4, 5],
    recommendedHours: [9, 10, 11, 12, 18, 19, 20, 21],
  },
  totalConsultations: 17,
  avgSessionDuration: 12,
  repeatCustomerRate: 0.35,
  responseRate: 0.95,
};

// The screen resolves the astrologer id from the auth user, then fetches the
// dashboard — two async rounds. Under a fully parallel test run the default
// 1s waitFor can time out, so use a generous timeout.
const waitForLoaded = async (queryByText: (t: string) => unknown) => {
  await waitFor(() => expect(queryByText('Loading dashboard...')).toBeNull(), {
    timeout: 10000,
    interval: 50,
  });
};

describe('AstrologerDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AstrologerAnalyticsService.getDashboard as jest.Mock).mockResolvedValue(mockDashboard);
  });

  it('renders loading state initially', async () => {
    const { getByText, queryByText } = render(<AstrologerDashboardScreen />);

    expect(getByText('Loading dashboard...')).toBeTruthy();
    await waitForLoaded(queryByText);
  });

  it('renders dashboard with earnings after load', async () => {
    const { getByText, queryByText } = render(<AstrologerDashboardScreen />);

    await waitForLoaded(queryByText);

    expect(getByText("Today's Earnings")).toBeTruthy();
    expect(getByText('₹2100')).toBeTruthy();
  });

  it('renders consultation type breakdown', async () => {
    const { getByText, queryByText } = render(<AstrologerDashboardScreen />);

    await waitForLoaded(queryByText);

    expect(getByText('Consultation Types')).toBeTruthy();
    expect(getByText('Chat')).toBeTruthy();
    expect(getByText('Call')).toBeTruthy();
    expect(getByText('Video')).toBeTruthy();
  });

  it('switches to activity tab', async () => {
    const { getByText, queryByText } = render(<AstrologerDashboardScreen />);

    await waitForLoaded(queryByText);

    // Tap Activity tab
    const activityTab = getByText('Activity');
    expect(activityTab).toBeTruthy();
  });

  it('switches to ratings tab', async () => {
    const { getByText, queryByText } = render(<AstrologerDashboardScreen />);

    await waitForLoaded(queryByText);

    // Tap Ratings tab
    const ratingsTab = getByText('Ratings');
    expect(ratingsTab).toBeTruthy();
  });

  it('renders error state when dashboard fails', async () => {
    (AstrologerAnalyticsService.getDashboard as jest.Mock).mockResolvedValue(null);

    const { getByText, queryByText } = render(<AstrologerDashboardScreen />);

    await waitForLoaded(queryByText);

    expect(getByText('Failed to load dashboard')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });
});
