import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, act, fireEvent } from '@testing-library/react-native';
import { useNarration } from '../useNarration';
import { speakWithBoundary } from '../../utils/audio';
import type { ListenStep } from '../../types';

jest.mock('../../utils/audio', () => ({ ...jest.requireActual('../../utils/audio'), speakWithBoundary: jest.fn() }));
const speak = speakWithBoundary as jest.Mock;

const steps: ListenStep[] = [{ text: 'First sentence here. Second one.' } as any];

function Harness() {
  const h = useNarration(steps, false);
  return (
    <>
      <Text testID="sentenceIdx">{h.sentenceIdx}</Text>
      <Text testID="wordIdx">{h.wordIdx}</Text>
      <TouchableOpacity testID="play" onPress={() => h.playListenStep(0)}><Text>x</Text></TouchableOpacity>
    </>
  );
}

const lastCall = () => speak.mock.calls[speak.mock.calls.length - 1];

beforeEach(() => { speak.mockReset(); jest.useRealTimers(); });

describe('useNarration — word-by-word highlight', () => {
  test('a word boundary from the voice moves the highlight to that word', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('play'));
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });

    expect(lastCall()[0]).toBe('First sentence here.');
    expect(screen.getByTestId('wordIdx').props.children).toBe(0);

    await act(async () => { lastCall()[1](6); }); // "sentence"
    expect(screen.getByTestId('wordIdx').props.children).toBe(1);
    await act(async () => { lastCall()[1](15); }); // "here."
    expect(screen.getByTestId('wordIdx').props.children).toBe(2);
  });

  test('the next sentence starts again from its first word', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('play'));
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    await act(async () => { lastCall()[1](15); });

    await act(async () => { lastCall()[2](); }); // onEnd
    expect(screen.getByTestId('sentenceIdx').props.children).toBe(1);
    expect(lastCall()[0]).toBe('Second one.');
    expect(screen.getByTestId('wordIdx').props.children).toBe(0);
  });

  test('a voice that sends no word boundaries still moves the highlight along over time', async () => {
    jest.useFakeTimers();
    await render(<Harness />);
    await act(async () => { fireEvent.press(screen.getByTestId('play')); });
    await act(async () => { jest.advanceTimersByTime(5); });
    expect(lastCall()[0]).toBe('First sentence here.');
    expect(screen.getByTestId('wordIdx').props.children).toBe(0);
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(screen.getByTestId('wordIdx').props.children).toBe(2);
  });
});
