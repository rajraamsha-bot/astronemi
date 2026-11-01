import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/Button';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(<Button title="Test Button" onPress={() => {}} />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Press Me" onPress={onPress} />);
    fireEvent.press(getByText('Press Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByText, queryByText } = render(<Button title="Loading" onPress={onPress} loading />);
    // Title should not be visible when loading (ActivityIndicator is shown instead)
    expect(queryByText('Loading')).toBeNull();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Button title="Disabled" onPress={onPress} disabled testID="btn" />);
    const btn = getByTestId('btn');
    expect(btn.props.disabled).toBe(true);
    expect(btn.props.onPress).toBeUndefined();
  });

  it('renders with primary variant', () => {
    const { getByText } = render(<Button title="Primary" variant="primary" onPress={() => {}} />);
    expect(getByText('Primary')).toBeTruthy();
  });

  it('renders with danger variant', () => {
    const { getByText } = render(<Button title="Danger" variant="danger" onPress={() => {}} />);
    expect(getByText('Danger')).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const { getByText: getSm } = render(<Button title="Small" size="sm" onPress={() => {}} />);
    const { getByText: getMd } = render(<Button title="Medium" size="md" onPress={() => {}} />);
    const { getByText: getLg } = render(<Button title="Large" size="lg" onPress={() => {}} />);
    expect(getSm('Small')).toBeTruthy();
    expect(getMd('Medium')).toBeTruthy();
    expect(getLg('Large')).toBeTruthy();
  });

  it('renders with icon', () => {
    const { getByText } = render(<Button title="With Icon" icon="checkmark" onPress={() => {}} />);
    expect(getByText('With Icon')).toBeTruthy();
  });

  it('applies fullWidth style', () => {
    const { getByTestId } = render(<Button title="Full" fullWidth onPress={() => {}} testID="button" />);
    const button = getByTestId('button');
    expect(button.props.style).toContainEqual({ width: '100%' });
  });
});
