/**
 * Astrologer Onboarding Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AstrologerOnboardingScreen from '@/app/astrologer-onboarding';
import { AstrologerOnboardingService } from '@/services/astrologer-onboarding';

jest.mock('@/services/astrologer-onboarding', () => ({
  AstrologerOnboardingService: {
    getSkillsTestQuestions: jest.fn(() => [
      {
        id: 'q1',
        category: 'basic_astrology',
        question: 'What is the ruling planet of Mesha?',
        options: ['Sun', 'Moon', 'Mars', 'Jupiter'],
        correctAnswer: 2,
      },
      {
        id: 'q2',
        category: 'basic_astrology',
        question: 'How many Nakshatras?',
        options: ['12', '27', '36', '108'],
        correctAnswer: 1,
      },
    ]),
    submitSkillsTest: jest.fn(() =>
      Promise.resolve({ success: true, result: { passed: true, score: 100 } })
    ),
  },
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

describe('AstrologerOnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders step indicators', () => {
    const { getByText } = render(<AstrologerOnboardingScreen />);
    expect(getByText('Astrologer Partner')).toBeTruthy();
  });

  it('shows profile form on first step', () => {
    const { getByText, getByPlaceholderText } = render(<AstrologerOnboardingScreen />);
    expect(getByText('Basic Profile')).toBeTruthy();
    expect(getByPlaceholderText('Rahul Sharma')).toBeTruthy();
  });

  it('navigates to expertise step', () => {
    const { getByText, getByPlaceholderText } = render(<AstrologerOnboardingScreen />);

    // Continue to next step
    fireEvent.press(getByText('Continue'));

    expect(getByText('Professional Expertise')).toBeTruthy();
    expect(getByPlaceholderText('e.g. 10')).toBeTruthy();
  });

  it('shows skills test on step 3', () => {
    const { getByText } = render(<AstrologerOnboardingScreen />);

    // Navigate to step 3 (skills test)
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));

    expect(getByText('Skills Assessment')).toBeTruthy();
    expect(getByText('Submit Test')).toBeTruthy();
  });

  it('allows selecting test answers', () => {
    const { getByText } = render(<AstrologerOnboardingScreen />);

    // Navigate to skills test
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));

    // Select an answer
    fireEvent.press(getByText('Mars'));

    expect(getByText('Submit Test')).toBeTruthy();
  });

  it('submits skills test and shows result', async () => {
    const { getByText, queryByText } = render(<AstrologerOnboardingScreen />);

    // Navigate to skills test
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));

    // Select answers for both questions
    fireEvent.press(getByText('Mars'));
    fireEvent.press(getByText('27'));

    fireEvent.press(getByText('Submit Test'));

    await waitFor(() => {
      expect(AstrologerOnboardingService.submitSkillsTest).toHaveBeenCalled();
    });
  });
});
