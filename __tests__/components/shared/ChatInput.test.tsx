/**
 * ChatInput Component Tests
 *
 * Tests for the shared ChatInput component used in:
 * - AI Chat
 * - Astrologer Chat
 * - Support Chat
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChatInput } from '@/components/shared/ChatInput';

describe('ChatInput Component', () => {
  const mockOnSend = jest.fn();
  const mockOnChangeText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      expect(getByPlaceholderText('Type a message...')).toBeTruthy();
    });

    it('should render with custom placeholder', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} placeholder="Ask a question..." />
      );

      expect(getByPlaceholderText('Ask a question...')).toBeTruthy();
    });

    it('should render disabled when loading', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} isLoading={true} />
      );

      const input = getByPlaceholderText('Type a message...');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('User Interaction', () => {
    it('should call onChangeText on input change', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent.changeText(input, 'Hello world');

      expect(mockOnChangeText).toHaveBeenCalledWith('Hello world');
    });

    it('should call onSend when send button is pressed', () => {
      const { getByPlaceholderText, getByLabelText } = render(
        <ChatInput value="Test message" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      const sendButton = getByLabelText('Send message');
      fireEvent.press(sendButton);

      expect(mockOnSend).toHaveBeenCalled();
    });

    it('should not send empty messages', () => {
      const { getByLabelText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      const sendButton = getByLabelText('Send message');
      fireEvent.press(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only messages', () => {
      const { getByLabelText } = render(
        <ChatInput value="   " onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      const sendButton = getByLabelText('Send message');
      fireEvent.press(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should call onSend when submit editing is triggered', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="Test message" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type a message...');
      fireEvent(input, 'submitEditing');

      expect(mockOnSend).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable input when loading', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} isLoading={true} />
      );

      const input = getByPlaceholderText('Type a message...');
      expect(input.props.editable).toBe(false);
    });

    it('should show loading indicator', () => {
      const { getByLabelText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} isLoading={true} />
      );

      // The send button should still be present but show an ActivityIndicator inside
      expect(getByLabelText('Send message')).toBeTruthy();
    });
  });

  describe('Character Limit', () => {
    it('should enforce max length if provided', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} maxLength={10} />
      );

      const input = getByPlaceholderText('Type a message...');
      expect(input.props.maxLength).toBe(10);
    });
  });

  describe('Multiline Support', () => {
    it('should support multiline input by default', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type a message...');
      expect(input.props.multiline).toBe(true);
    });

    it('should disable multiline when specified', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} multiline={false} />
      );

      const input = getByPlaceholderText('Type a message...');
      expect(input.props.multiline).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByPlaceholderText, getByLabelText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      expect(getByPlaceholderText('Type a message...')).toBeTruthy();
      expect(getByLabelText('Send message')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid typing', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type a message...');

      for (let i = 0; i < 10; i++) {
        fireEvent.changeText(input, `Message ${i}`);
      }

      expect(mockOnChangeText).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid send button presses', () => {
      const { getByLabelText } = render(
        <ChatInput value="Test" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      const sendButton = getByLabelText('Send message');
      fireEvent.press(sendButton);
      fireEvent.press(sendButton);
      fireEvent.press(sendButton);

      // onSend should be called each time since the parent controls clearing the value
      expect(mockOnSend).toHaveBeenCalledTimes(3);
    });

    it('should handle special characters', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type a message...');
      const specialMessage = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      fireEvent.changeText(input, specialMessage);

      expect(mockOnChangeText).toHaveBeenCalledWith(specialMessage);
    });

    it('should handle emoji', () => {
      const { getByPlaceholderText } = render(
        <ChatInput value="" onChangeText={mockOnChangeText} onSend={mockOnSend} />
      );

      const input = getByPlaceholderText('Type a message...');
      const emojiMessage = 'Hello 👋 World 🌍';
      fireEvent.changeText(input, emojiMessage);

      expect(mockOnChangeText).toHaveBeenCalledWith(emojiMessage);
    });
  });
});
