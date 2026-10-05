// useNarration is driven through the real speakWithBoundary, which under
// jest-expo's default non-web Platform.OS short-circuits to call onEnd()
// immediately (see utils/audio.ts) — so a "prose" narration chain plays
// through every sentence synchronously in one microtask flush, while a
// "poem" chain pauses 450ms between lines (real setTimeout), requiring fake
// timers to drain.

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useNarration } from '../useNarration';
import type { ListenStep } from '../../types';

const steps: ListenStep[] = [
  { text: 'First sentence. Second sentence.' } as any,
  { text: 'Another step sentence.' } as any,
];

function Harness({ isPoem = false }: { isPoem?: boolean }) {
  const h = useNarration(steps, isPoem);
  return (
    <>
      <Text testID="listenStep">{h.listenStep}</Text>
      <Text testID="listenPlaying">{String(h.listenPlaying)}</Text>
      <Text testID="sentenceIdx">{h.sentenceIdx}</Text>
      <Text testID="visited">{JSON.stringify([...h.visitedSteps])}</Text>
      <Text testID="rate">{h.playbackRate}</Text>
      <TouchableOpacity testID="play0" onPress={() => h.playListenStep(0)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="play1" onPress={() => h.playListenStep(1)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="toggle" onPress={() => h.toggleListenPlay()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="repeat" onPress={() => h.repeatStep()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="goto1" onPress={() => h.goToListenStep(1)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="skipNext" onPress={() => h.skipBy(10)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="skipPrev" onPress={() => h.skipBy(-10)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="rate1_5" onPress={() => h.changePlaybackRate(1.5)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="reset" onPress={() => h.resetNarration()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

describe('useNarration — initial state', () => {
  test('starts on real step 0, not playing, with only step 0 marked visited', async () => {
    await render(<Harness />);
    expect(screen.getByTestId('listenStep').props.children).toBe(0);
    expect(screen.getByTestId('listenPlaying').props.children).toBe('false');
    expect(screen.getByTestId('visited').props.children).toBe('[0]');
  });
});

describe('useNarration — playback (prose, non-web short-circuit)', () => {
  test('playListenStep runs the real chain to completion and marks the step visited', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('play0'));

    await waitFor(() => expect(screen.getByTestId('listenPlaying').props.children).toBe('false'));
    expect(JSON.parse(screen.getByTestId('visited').props.children)).toEqual(expect.arrayContaining([0]));
  });

  test('playListenStep(1) switches to real step 1 and plays it', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('play1'));

    await waitFor(() => expect(screen.getByTestId('listenStep').props.children).toBe(1));
    await waitFor(() => expect(screen.getByTestId('listenPlaying').props.children).toBe('false'));
  });

});

describe('useNarration — navigation without playing', () => {
  test('goToListenStep jumps to the real step, resets sentenceIdx, marks it visited, no playback', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('goto1'));

    expect(screen.getByTestId('listenStep').props.children).toBe(1);
    expect(screen.getByTestId('sentenceIdx').props.children).toBe(0);
    expect(screen.getByTestId('listenPlaying').props.children).toBe('false');
    expect(JSON.parse(screen.getByTestId('visited').props.children)).toEqual(expect.arrayContaining([0, 1]));
  });

  test('skipBy while not playing only moves sentenceIdx, does not start playback', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('skipNext'));

    expect(screen.getByTestId('sentenceIdx').props.children).toBe(1);
    expect(screen.getByTestId('listenPlaying').props.children).toBe('false');
  });

  test('skipBy backwards from sentence 0 stays clamped at 0', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('skipPrev'));

    expect(screen.getByTestId('sentenceIdx').props.children).toBe(0);
  });
});

describe('useNarration — playback rate', () => {
  test('changePlaybackRate updates the real rate even while not playing', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('rate1_5'));

    expect(screen.getByTestId('rate').props.children).toBe(1.5);
  });
});

describe('useNarration — reset', () => {
  test('resetNarration returns to real step 0, sentence 0, not playing, visited reset to {0}', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('goto1'));
    expect(screen.getByTestId('listenStep').props.children).toBe(1);

    await user.press(screen.getByTestId('reset'));

    expect(screen.getByTestId('listenStep').props.children).toBe(0);
    expect(screen.getByTestId('sentenceIdx').props.children).toBe(0);
    expect(screen.getByTestId('listenPlaying').props.children).toBe('false');
    expect(screen.getByTestId('visited').props.children).toBe('[0]');
  });
});

describe('useNarration — poem cadence', () => {
  test('a real poem chain pauses between lines via real setTimeout(450) before advancing', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<Harness isPoem />);

    await user.press(screen.getByTestId('play0'));
    // Immediately after starting, the first line's onEnd fired synchronously
    // (non-web short-circuit) but the 450ms poem pause has not elapsed yet.
    expect(screen.getByTestId('listenPlaying').props.children).toBe('true');

    jest.advanceTimersByTime(500);
    await waitFor(() => expect(screen.getByTestId('listenPlaying').props.children).toBe('false'));

    jest.useRealTimers();
  });
});

describe('useNarration — play script', () => {
  const playSteps: ListenStep[] = [
    { text: 'x', lines: [{ speaker: 'Narrator', text: 'The court waits.', stage: true }, { speaker: 'King', text: 'Speak.' }] } as any,
    { text: 'y', lines: [{ speaker: 'Har Datt', text: 'The tail is short.', card: 4 }] } as any,
  ];

  function PlayHarness() {
    const h = useNarration(playSteps, false);
    return (
      <>
        <Text testID="step">{h.listenStep}</Text>
        <Text testID="lines">{h.listenSentences.map((s: any) => s.line?.speaker).join('|')}</Text>
        <Text testID="playing">{String(h.listenPlaying)}</Text>
        <TouchableOpacity testID="play" onPress={() => h.playListenStep(0)}><Text>x</Text></TouchableOpacity>
      </>
    );
  }

  test('one line per character turn, and the play carries on into the next scene by itself', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<PlayHarness />);
    expect(screen.getByTestId('lines').props.children).toBe('Narrator|King');

    await user.press(screen.getByTestId('play'));
    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(screen.getByTestId('step').props.children).toBe(1));
    expect(screen.getByTestId('lines').props.children).toBe('Har Datt');

    jest.useRealTimers();
  });

  test('when the whole play has been read, it goes back to the first scene for the next Play', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<PlayHarness />);
    await user.press(screen.getByTestId('play'));
    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(screen.getByTestId('step').props.children).toBe(1));
    jest.advanceTimersByTime(3000);
    await waitFor(() => expect(screen.getByTestId('step').props.children).toBe(0));
    expect(screen.getByTestId('lines').props.children).toBe('Narrator|King');

    jest.useRealTimers();
  });
});
