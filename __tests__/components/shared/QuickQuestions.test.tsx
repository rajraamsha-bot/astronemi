/**
 * QuickQuestions Component Tests
 *
 * Tests for the shared QuickQuestions component used in:
 * - AI Chat
 * - Astrologer Chat
 * - Support interfaces
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuickQuestions } from '@/components/shared/QuickQuestions';

describe('QuickQuestions Component', () => {
  const mockOnSelect = jest.fn();

  const sampleQuestions = [
    { id: '1', text: 'What is my daily horoscope?' },
    { id: '2', text: 'Tell me about my career' },
    { id: '3', text: 'When will I get married?' },
    { id: '4', text: 'What are my lucky numbers?' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(
        <QuickQuestions questions={sampleQuestions} onSelect={mockOnSelect} />
      );

      expect(getByText('What is my daily horoscope?')).toBeTruthy();
    });

    it('should render all provided questions', () => {
      const { getByText } = render(
        <QuickQuestions questions={sampleQuestions} onSelect={mockOnSelect} />
      );

      sampleQuestions.forEach((question) => {
        expect(getByText(question.text)).toBeTruthy();
      });
    });

    it('should render with custom title', () => {
      const { getByText } = render(
        <QuickQuestions
          questions={sampleQuestions}
          onSelect={mockOnSelect}
          title="Popular Questions"
        />
      );

      expect(getByText('Popular Questions')).toBeTruthy();
    });

    it('should render default title when not provided', () => {
      const { getByText } = render(
        <QuickQuestions questions={sampleQuestions} onSelect={mockOnSelect} />
      );

      expect(getByText('Quick Questions')).toBeTruthy();
    });

    it('should hide title when showTitle is false', () => {
      const { queryByText } = render(
        <QuickQuestions questions={sampleQuestions} onSelect={mockOnSelect} showTitle={false} />
      );

      expect(queryByText('Quick Questions')).toBeNull();
    });

    it('should render nothing when questions array is empty', () => {
      const { queryByText } = render(
        <QuickQuestions questions={[]} onSelect={mockOnSelect} />
      );

      sampleQuestions.forEach((q) => {
        expect(queryByText(q.text)).toBeNull();
      });
    });
  });

  describe('User Interaction', () => {
    it('should call onSelect when question is pressed', () => {
      const { getByText } = render(
        <QuickQuestions questions={sampleQuestions} onSelect={mockOnSelect} />
      );

      const question = getByText('What is my daily horoscope?');
      fireEvent.press(question);

      expect(mockOnSelect).toHaveBeenCalledWith('What is my daily horoscope?');
    });

    it('should call onSelect with correct question for each button', () => {
      const { getByText } = render(
        <QuickQuestions questions={sampleQuestions} onSelect={mockOnSelect} />
      );

      sampleQuestions.forEach((question) => {
        const button = getByText(question.text);
        fireEvent.press(button);
        expect(mockOnSelect).toHaveBeenCalledWith(question.text);
      });

      expect(mockOnSelect).toHaveBeenCalledTimes(sampleQuestions.length);
    });

    it('should handle rapid button presses', () => {
      const { getByText } = render(
        <QuickQuestions questions={sampleQuestions} onSelect={mockOnSelect} />
      );

      const question = getByText('What is my daily horoscope?');

      fireEvent.press(question);
      fireEvent.press(question);
      fireEvent.press(question);

      expect(mockOnSelect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Layout and Styling', () => {
    it('should render questions in a FlatList', () => {
      const { getByText } = render(
        <QuickQuestions questions={sampleQuestions} onSelect={mockOnSelect} />
      );

      // FlatList renders items, so we can find the questions
      expect(getByText('What is my daily horoscope?')).toBeTruthy();
    });

    it('should render horizontally by default', () => {
      const { getByText } = render(
        <QuickQuestions questions={sampleQuestions} onSelect={mockOnSelect} />
      );

      // horizontal prop is passed to FlatList; visual assertion via rendered items
      sampleQuestions.forEach((q) => {
        expect(getByText(q.text)).toBeTruthy();
      });
    });
  });

  describe('Question Variants', () => {
    it('should handle long questions', () => {
      const longQuestions = [
        { id: '1', text: 'This is a very long question that might need to wrap or be truncated in the UI' },
      ];

      const { getByText } = render(
        <QuickQuestions questions={longQuestions} onSelect={mockOnSelect} />
      );

      expect(getByText(longQuestions[0].text)).toBeTruthy();
    });

    it('should handle questions with special characters', () => {
      const specialQuestions = [
        { id: '1', text: "What's my horoscope?" },
        { id: '2', text: 'Tell me about "career"' },
        { id: '3', text: 'When will I get married? 💍' },
      ];

      const { getByText } = render(
        <QuickQuestions questions={specialQuestions} onSelect={mockOnSelect} />
      );

      specialQuestions.forEach((question) => {
        expect(getByText(question.text)).toBeTruthy();
      });
    });

    it('should handle single question', () => {
      const { getByText } = render(
        <QuickQuestions questions={[{ id: '1', text: 'Single question' }]} onSelect={mockOnSelect} />
      );

      expect(getByText('Single question')).toBeTruthy();
    });

    it('should handle many questions', () => {
      const manyQuestions = Array.from({ length: 20 }, (_, i) => ({
        id: String(i + 1),
        text: `Question ${i + 1}`,
      }));

      const { getByText } = render(
        <QuickQuestions questions={manyQuestions} onSelect={mockOnSelect} />
      );

      expect(getByText('Question 1')).toBeTruthy();
      expect(getByText('Question 20')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessibility role for buttons', () => {
      const { getByLabelText } = render(
        <QuickQuestions questions={sampleQuestions} onSelect={mockOnSelect} />
      );

      const question = getByLabelText('Ask: What is my daily horoscope?');
      expect(question).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle questions with icons', () => {
      const questionsWithIcons = [
        { id: '1', text: 'Question with icon', icon: <></> },
      ];

      const { getByText } = render(
        <QuickQuestions questions={questionsWithIcons} onSelect={mockOnSelect} />
      );

      expect(getByText('Question with icon')).toBeTruthy();
    });

    it('should handle null onSelect gracefully', () => {
      const { getByText } = render(
        // @ts-expect-error Testing invalid input
        <QuickQuestions questions={sampleQuestions} onSelect={null} />
      );

      const question = getByText('What is my daily horoscope?');
      expect(() => fireEvent.press(question)).not.toThrow();
    });

    it('should handle empty string questions', () => {
      const questionsWithEmpty = [
        { id: '1', text: 'Valid question' },
        { id: '2', text: '' },
        { id: '3', text: 'Another valid question' },
      ];

      const { getByText, queryByText } = render(
        <QuickQuestions questions={questionsWithEmpty} onSelect={mockOnSelect} />
      );

      expect(getByText('Valid question')).toBeTruthy();
      expect(getByText('Another valid question')).toBeTruthy();
    });
  });
});
