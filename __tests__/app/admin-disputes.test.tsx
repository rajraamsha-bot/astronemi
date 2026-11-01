/**
 * Admin Disputes Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AdminDisputesScreen from '@/app/admin/disputes';
import { ConsultationQualityService } from '@/services/consultation-quality';

jest.mock('@/services/consultation-quality', () => ({
  ConsultationQualityService: {
    resolveDispute: jest.fn(() => Promise.resolve({ success: true })),
    listDisputes: jest.fn(() => Promise.resolve([
      {
        id: 'd1',
        status: 'open',
        reason: 'unsatisfactory_service',
        description: 'The astrologer was not helpful.',
        consultationId: 'c1',
        createdAt: '2026-05-21T10:00:00Z',
      },
      {
        id: 'd2',
        status: 'resolved',
        reason: 'technical_issue',
        description: 'Call disconnected frequently.',
        consultationId: 'c2',
        createdAt: '2026-05-21T10:00:00Z',
      }
    ])),
  },
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

describe('AdminDisputesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header and search', async () => {
    jest.setTimeout(15000);
    const { getByText, getByPlaceholderText } = render(<AdminDisputesScreen />);

    await waitFor(() => expect(getByText('Dispute Resolution')).toBeTruthy());
    expect(getByPlaceholderText('Search disputes...')).toBeTruthy();
  });

  it('renders filter chips', async () => {
    const { getByText } = render(<AdminDisputesScreen />);

    await waitFor(() => {
      expect(getByText('All')).toBeTruthy();
      expect(getByText('Open')).toBeTruthy();
      expect(getByText('Resolved')).toBeTruthy();
      expect(getByText('Rejected')).toBeTruthy();
    });
  });

  it('renders dispute cards', async () => {
    const { getByText } = render(<AdminDisputesScreen />);

    await waitFor(() => {
      expect(getByText('unsatisfactory_service')).toBeTruthy();
      expect(getByText('technical_issue')).toBeTruthy();
    });
  });

  it('filters disputes by status', async () => {
    const { getByText, queryByText } = render(<AdminDisputesScreen />);

    await waitFor(() => expect(getByText('unsatisfactory_service')).toBeTruthy());

    // Tap Resolved filter
    fireEvent.press(getByText('Resolved'));

    await waitFor(() => {
      expect(queryByText('unsatisfactory_service')).toBeNull();
    });
  });

  it('opens resolution modal on card tap', async () => {
    const { getByText, getAllByText } = render(<AdminDisputesScreen />);

    await waitFor(() => expect(getByText('unsatisfactory_service')).toBeTruthy());

    // Tap first dispute card
    const cards = getAllByText('unsatisfactory_service');
    fireEvent.press(cards[0]);

    await waitFor(() => {
      expect(getByText('Resolve Dispute')).toBeTruthy();
    });
  });
});
