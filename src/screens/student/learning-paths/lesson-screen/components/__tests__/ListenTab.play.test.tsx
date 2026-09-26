import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import ListenTab from '../ListenTab';
import { buildReasoningListen } from '../../utils/listenFromBlocks';

jest.mock('../../utils/audio', () => ({ ...jest.requireActual('../../utils/audio'), speakWithBoundary: jest.fn() }));
jest.mock('../../utils/book', () => ({ bookSrc: () => 'https://example.com/book.pdf' }));

const colors: any = { cardDark: '#f5f5f5', textMain: '#111', textMuted: '#666', textDim: '#999', borderColor: '#ccc', primary: '#0a7', bgDark: '#fff', accentGreen: '#2a7', accentYellow: '#ec0' };
const styles: any = new Proxy({}, { get: () => ({}) });

const payload = {
  blocks: [
    { type: 'process', title: 'Deductive Reasoning Flow', steps: ['Action: a.', 'Evidence: b.', 'Thought: c.', 'Reasoning: d.', 'Conclusion: e.'] },
  ],
  listenScript: [
    { card: null, heading: 'Scene One', text: 'x', lines: [{ speaker: 'Ram Datt', text: 'Look at the tracks.', page: 30 }] },
    { card: null, heading: 'Scene Two', text: 'y', lines: [{ speaker: 'Merchant', text: 'Have you seen my camel?', direction: 'Anxious', page: 31 }] },
  ],
};

function renderPlay(listenStep: number, playListenStep = jest.fn()) {
  const reasoning = buildReasoningListen(payload)!;
  const step = reasoning.steps[listenStep];
  const narration: any = {
    listenStep, listenPlaying: false, sentenceIdx: 0, visitedSteps: new Set([listenStep]), clockTick: 0,
    playbackRate: 1, speedMenuOpen: false, setSpeedMenuOpen: jest.fn(),
    currentListenStep: step, listenSentences: step.lines!.map((line) => ({ sentence: line.text, start: 0, end: 1, line })),
    sentenceYRef: { current: [] }, leftScrollRef: { current: null },
    toggleListenPlay: jest.fn(), repeatStep: jest.fn(), goToListenStep: jest.fn(), playListenStep, skipBy: jest.fn(), changePlaybackRate: jest.fn(),
  };
  return render(
    <ListenTab
      topic={{ name: 'Camel', pdfFile: 'hepr101.pdf', pdfPage: 35, readText: {} }}
      isMath={false} listenSteps={reasoning.steps} reasoning={reasoning} grade="Grade 8" subject="English"
      colors={colors} styles={styles} narration={narration} fontLarge={false} setFontLarge={jest.fn()}
      vocab={[]} vocabIndex={0} setVocabIndex={jest.fn()} pauseAnswer={null} setPauseAnswer={jest.fn()}
      whyOpen={false} setWhyOpen={jest.fn()} explainOpen={false} setExplainOpen={jest.fn()}
      hintOpen={false} setHintOpen={jest.fn()} exampleOpen={false} setExampleOpen={jest.fn()}
      setMode={jest.fn()} setZoomImage={jest.fn()}
    />,
  );
}

describe('ListenTab play script', () => {
  test('shows every scene of the play at once, not only the one being played', async () => {
    await renderPlay(0);
    expect(screen.getByText('Scene One')).toBeTruthy();
    expect(screen.getByText('Scene Two')).toBeTruthy();
    expect(screen.getByText('Look at the tracks.')).toBeTruthy();
    expect(screen.getByText('Have you seen my camel?')).toBeTruthy();
    expect(screen.getByText('Merchant')).toBeTruthy();
    expect(screen.getByText('(Anxious)')).toBeTruthy();
  });

  test('tapping a scene plays from that scene', async () => {
    const play = jest.fn();
    const user = userEvent.setup();
    await renderPlay(0, play);
    await user.press(screen.getByTestId('scene-1'));
    expect(play).toHaveBeenCalledWith(1);
  });

  test('the Listening Progress footer and Previous/Next buttons are gone', async () => {
    await renderPlay(0);
    expect(screen.queryByText('Listening Progress')).toBeNull();
    expect(screen.queryByText('Listen Again')).toBeNull();
    expect(screen.queryByText('Next')).toBeNull();
    expect(screen.queryByText('Previous')).toBeNull();
  });
});
