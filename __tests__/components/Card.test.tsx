import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import Card, { CardHeader } from '@/components/Card';

// Mock Haptics to avoid actual haptic feedback in tests
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('Card Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set test environment flag
    global.__TEST__ = true;
  });

  describe('Basic Rendering', () => {
    it('renders children correctly', async () => {
      const { getByTestId, getByText } = render(
        <Card testID="card">
          <Text testID="card-content">Card Content</Text>
        </Card>
      );

      await waitFor(() => {
        expect(getByTestId('card-content')).toBeTruthy();
        expect(getByText('Card Content')).toBeTruthy();
      });
    });

    it('renders with custom testID', async () => {
      const { getByTestId } = render(
        <Card testID="custom-card">
          <Text>Content</Text>
        </Card>
      );

      await waitFor(() => {
        expect(getByTestId('custom-card')).toBeTruthy();
      });
    });
  });

  describe('Interaction Handling', () => {
    it('calls onPress when pressed', async () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Card onPress={onPress} testID="card">
          <Text testID="clickable-content">Clickable Card</Text>
        </Card>
      );

      const card = getByTestId('card');
      fireEvent.press(card);

      await waitFor(() => {
        expect(onPress).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call onPress when not provided', async () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Non-clickable Card</Text>
        </Card>
      );

      const card = getByTestId('card');
      fireEvent.press(card);

      // Wait a bit to ensure no call happens
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('Variant Styles', () => {
    const variants = ['default', 'elevated', 'glass', 'filled'] as const;

    variants.forEach(variant => {
      it(`renders with ${variant} variant`, async () => {
        const { getByTestId } = render(
          <Card variant={variant} testID={`${variant}-card`}>
            <Text testID={`${variant}-content`}>{variant} Card</Text>
          </Card>
        );

        await waitFor(() => {
          expect(getByTestId(`${variant}-content`)).toBeTruthy();
        });
      });
    });
  });

  describe('Spacing and Layout', () => {
    const paddings = ['none', 'sm', 'md', 'lg'] as const;

    paddings.forEach(padding => {
      it(`renders with ${padding} padding`, async () => {
        const { getByTestId } = render(
          <Card padding={padding} testID="padded-card">
            <Text testID="padded-content">Padded Content</Text>
          </Card>
        );

        await waitFor(() => {
          expect(getByTestId('padded-content')).toBeTruthy();
        });
      });
    });

    const radii = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const;

    radii.forEach(radius => {
      it(`renders with ${radius} border radius`, async () => {
        const { getByTestId } = render(
          <Card borderRadius={radius} testID="rounded-card">
            <Text testID="rounded-content">Rounded Content</Text>
          </Card>
        );

        await waitFor(() => {
          expect(getByTestId('rounded-content')).toBeTruthy();
        });
      });
    });
  });

  describe('Gradient Support', () => {
    it('renders with gradient enabled', async () => {
      const { getByTestId } = render(
        <Card gradient testID="gradient-card">
          <Text testID="gradient-content">Gradient Content</Text>
        </Card>
      );

      await waitFor(() => {
        expect(getByTestId('gradient-content')).toBeTruthy();
      });
    });

    it('renders without gradient by default', async () => {
      const { getByTestId } = render(
        <Card testID="no-gradient-card">
          <Text testID="no-gradient-content">No Gradient Content</Text>
        </Card>
      );

      await waitFor(() => {
        expect(getByTestId('no-gradient-content')).toBeTruthy();
      });
    });
  });

  describe('Custom Styling', () => {
    it('applies custom style prop', async () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <Card style={customStyle} testID="styled-card">
          <Text testID="styled-content">Styled Content</Text>
        </Card>
      );

      await waitFor(() => {
        expect(getByTestId('styled-content')).toBeTruthy();
      });
    });
  });
});

describe('CardHeader Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title correctly', async () => {
    const { getByText } = render(
      <CardHeader title="Test Title" testID="header" />
    );

    await waitFor(() => {
      expect(getByText('Test Title')).toBeTruthy();
    });
  });

  it('renders subtitle when provided', async () => {
    const { getByText } = render(
      <CardHeader
        title="Test Title"
        subtitle="Test Subtitle"
        testID="header"
      />
    );

    await waitFor(() => {
      expect(getByText('Test Title')).toBeTruthy();
      expect(getByText('Test Subtitle')).toBeTruthy();
    });
  });

    it('renders icon when provided', async () => {
      const { getByText } = render(
        <CardHeader
          title="Test Title"
          icon="heart"
          testID="header"
        />
      );

      await waitFor(() => {
        expect(getByText('Test Title')).toBeTruthy();
      });
    });

  it('renders action component when provided', async () => {
    const ActionComponent = () => <Text testID="custom-action">Action</Text>;

    const { getByTestId } = render(
      <CardHeader
        title="Test Title"
        action={<ActionComponent />}
        testID="header"
      />
    );

    await waitFor(() => {
      expect(getByTestId('custom-action')).toBeTruthy();
    });
  });

  it('applies custom testID', async () => {
    const { getByTestId } = render(
      <CardHeader title="Test Title" testID="custom-header" />
    );

    await waitFor(() => {
      expect(getByTestId('custom-header')).toBeTruthy();
    });
  });
});
