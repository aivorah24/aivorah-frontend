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
      <TouchableOpacity testID="toggle" onPress={() => h.toggleListenPlay()}><Text>x</Text></TouchableOpacity>
      <Text testID="playing">{String(h.listenPlaying)}</Text>
      <Text testID="paused">{String(h.paused)}</Text>
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
    await act(async () => { lastCall()[5](); });
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
    expect(screen.getByTestId('wordIdx').props.children).toBe(-1);
    await act(async () => { lastCall()[5](); });
    expect(screen.getByTestId('wordIdx').props.children).toBe(0);
  });

  test('a voice that sends no word boundaries still moves the highlight along over time', async () => {
    jest.useFakeTimers();
    await render(<Harness />);
    await act(async () => { fireEvent.press(screen.getByTestId('play')); });
    await act(async () => { jest.advanceTimersByTime(5); });
    expect(lastCall()[0]).toBe('First sentence here.');
    await act(async () => { lastCall()[5](); }); // voice starts
    expect(screen.getByTestId('wordIdx').props.children).toBe(0);
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(screen.getByTestId('wordIdx').props.children).toBe(2);
  });

  test('nothing is highlighted, and the highlight does not move, until the voice actually starts', async () => {
    jest.useFakeTimers();
    await render(<Harness />);
    await act(async () => { fireEvent.press(screen.getByTestId('play')); });
    await act(async () => { jest.advanceTimersByTime(3000); }); // voice still warming up
    expect(screen.getByTestId('wordIdx').props.children).toBe(-1);

    await act(async () => { lastCall()[5](); });
    expect(screen.getByTestId('wordIdx').props.children).toBe(0);
  });

  test('pause then play carries on from the paused word, not from the start of the line', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('play'));
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    await act(async () => { lastCall()[5](); });
    await act(async () => { lastCall()[1](6); }); // "sentence"

    await user.press(screen.getByTestId('toggle')); // pause
    expect(screen.getByTestId('playing').props.children).toBe('false');
    expect(screen.getByTestId('paused').props.children).toBe('true');
    expect(screen.getByTestId('wordIdx').props.children).toBe(1);
    await user.press(screen.getByTestId('toggle')); // play

    expect(lastCall()[0]).toBe('sentence here.');
    expect(screen.getByTestId('sentenceIdx').props.children).toBe(0);
    await act(async () => { lastCall()[5](); });
    expect(screen.getByTestId('wordIdx').props.children).toBe(1);
    await act(async () => { lastCall()[1](9); }); // "here." in the resumed text
    expect(screen.getByTestId('wordIdx').props.children).toBe(2);
  });

  test('after the last word, Play starts again from the top', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('play'));
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    await act(async () => { lastCall()[5](); lastCall()[2](); }); // line 1 done
    await act(async () => { lastCall()[5](); lastCall()[1](7); lastCall()[2](); }); // line 2 done
    expect(screen.getByTestId('playing').props.children).toBe('false');
    expect(screen.getByTestId('sentenceIdx').props.children).toBe(0);
    expect(screen.getByTestId('paused').props.children).toBe('false');

    await user.press(screen.getByTestId('toggle'));
    expect(lastCall()[0]).toBe('First sentence here.');
  });

  test('if the voice never reports the end of a line, playback still moves on', async () => {
    jest.useFakeTimers();
    await render(<Harness />);
    await act(async () => { fireEvent.press(screen.getByTestId('play')); });
    await act(async () => { jest.advanceTimersByTime(5); });
    await act(async () => { lastCall()[5](); lastCall()[1](15); }); // voice reaches "here." then goes silent
    await act(async () => { jest.advanceTimersByTime(20000); });
    expect(screen.getByTestId('sentenceIdx').props.children).toBe(1);
    expect(lastCall()[0]).toBe('Second one.');
  });

  test('a line that reports its end twice only moves on once', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('play'));
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    const first = lastCall();
    await act(async () => { first[2](); first[2](); });
    expect(lastCall()[0]).toBe('Second one.');
    expect(speak.mock.calls.filter((c) => c[0] === 'Second one.')).toHaveLength(1);
  });
});
