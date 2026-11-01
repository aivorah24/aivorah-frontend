import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, act } from '@testing-library/react-native';
import { useNarration } from '../useNarration';
import { speakWithBoundary, stopSpeaking } from '../../utils/audio';
import type { ListenStep } from '../../types';

jest.mock('../../utils/audio', () => ({
  ...jest.requireActual('../../utils/audio'),
  speakWithBoundary: jest.fn(),
  stopSpeaking: jest.fn(),
}));
const speak = speakWithBoundary as jest.Mock;
const stop = stopSpeaking as jest.Mock;

const steps: ListenStep[] = [{ text: 'First sentence here. Second one.' } as any];

function makeNavigation() {
  const listeners: Record<string, () => void> = {};
  const unsubscribe = jest.fn();
  return {
    listeners,
    unsubscribe,
    addListener: jest.fn((event: string, cb: () => void) => { listeners[event] = cb; return unsubscribe; }),
  };
}

function Harness({ navigation }: { navigation: any }) {
  const h = useNarration(steps, false, undefined, navigation);
  return (
    <>
      <Text testID="playing">{String(h.listenPlaying)}</Text>
      <Text testID="sentenceIdx">{h.sentenceIdx}</Text>
      <TouchableOpacity testID="play" onPress={() => h.playListenStep(0)}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => { speak.mockReset(); stop.mockReset(); });

describe('useNarration — leaving the screen', () => {
  test('the voice stops when the lesson screen loses focus (drawer screens stay mounted)', async () => {
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await render(<Harness navigation={navigation} />);
    await user.press(screen.getByTestId('play'));
    expect(screen.getByTestId('playing').props.children).toBe('true');
    stop.mockClear();

    await act(async () => { navigation.listeners.blur?.(); });

    expect(stop).toHaveBeenCalled();
    expect(screen.getByTestId('playing').props.children).toBe('false');
  });

  test('a late "line finished" from the stopped voice does not start the next line', async () => {
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await render(<Harness navigation={navigation} />);
    await user.press(screen.getByTestId('play'));
    const onEnd = speak.mock.calls[speak.mock.calls.length - 1][2];
    const callsBefore = speak.mock.calls.length;

    await act(async () => { navigation.listeners.blur?.(); });
    await act(async () => { onEnd(); });

    expect(speak.mock.calls.length).toBe(callsBefore);
    expect(screen.getByTestId('playing').props.children).toBe('false');
  });

  test('stops listening when the screen unmounts', async () => {
    const navigation = makeNavigation();
    const { unmount } = await render(<Harness navigation={navigation} />);
    await unmount();
    expect(navigation.unsubscribe).toHaveBeenCalled();
  });

  test('works without navigation (embedded lesson)', async () => {
    const user = userEvent.setup();
    await render(<Harness navigation={undefined} />);
    await user.press(screen.getByTestId('play'));
    expect(screen.getByTestId('playing').props.children).toBe('true');
  });
});
