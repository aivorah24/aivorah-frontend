import React from 'react';
import { Text } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';

function Probe({ navigation }: { navigation: any }) {
  return <Text testID="tick">{useRefreshOnFocus(navigation, 1000)}</Text>;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('checks again every few seconds while the student is on the screen', async () => {
  await render(<Probe navigation={{ addListener: () => () => {}, isFocused: () => true }} />);
  expect(screen.getByTestId('tick').props.children).toBe(0);
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(screen.getByTestId('tick').props.children).toBe(3);
});

test('stays quiet while the screen is in the background', async () => {
  await render(<Probe navigation={{ addListener: () => () => {}, isFocused: () => false }} />);
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(screen.getByTestId('tick').props.children).toBe(0);
});

test('checks again when the student comes back to the screen', async () => {
  let onFocus: () => void = () => {};
  await render(<Probe navigation={{ addListener: (_: string, cb: () => void) => { onFocus = cb; return () => {}; }, isFocused: () => false }} />);
  await act(async () => { onFocus(); });
  expect(screen.getByTestId('tick').props.children).toBe(1);
});
