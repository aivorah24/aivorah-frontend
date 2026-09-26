import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ListenTab from '../ListenTab';
import { buildReasoningListen } from '../../utils/listenFromBlocks';
import { sentencesWithOffsets } from '../../utils/audio';

jest.mock('../../utils/audio', () => ({
  ...jest.requireActual('../../utils/audio'),
  speakWithBoundary: jest.fn(),
}));
jest.mock('../../utils/book', () => ({ bookSrc: () => 'https://example.com/book.pdf' }));

const colors: any = { cardDark: '#f5f5f5', textMain: '#111', textMuted: '#666', textDim: '#999', borderColor: '#ccc', primary: '#0a7', bgDark: '#fff', accentGreen: '#2a7', accentYellow: '#ec0' };
const styles: any = new Proxy({}, { get: () => ({}) });

const payload = {
  blocks: [
    { type: 'overview', text: 'How can drops of blood reveal a tail?' },
    { type: 'prose_excerpt', sourceText: 'I noticed small droplets of blood along the track.', explanation: 'Har Datt explains.' },
    {
      type: 'process', title: 'Deductive Reasoning Flow',
      steps: ['Action: Har Datt notices the track.', 'Evidence: Small droplets of blood are found.', 'Thought: Mosquito bites are the likely cause.', 'Reasoning: A long tail would fend off pests.', 'Conclusion: The camel must have a short tail.'],
    },
  ],
};

function renderAt(listenStep: number) {
  const reasoning = buildReasoningListen(payload)!;
  const step = reasoning.steps[listenStep];
  const narration: any = {
    listenStep, listenPlaying: false, sentenceIdx: 0, visitedSteps: new Set([listenStep]), clockTick: 0,
    playbackRate: 1, speedMenuOpen: false, setSpeedMenuOpen: jest.fn(),
    currentListenStep: step, listenSentences: sentencesWithOffsets(step.text),
    sentenceYRef: { current: [] }, leftScrollRef: { current: null },
    toggleListenPlay: jest.fn(), repeatStep: jest.fn(), goToListenStep: jest.fn(), skipBy: jest.fn(), changePlaybackRate: jest.fn(),
  };
  return render(
    <ListenTab
      topic={{ name: 'Camel', pdfFile: 'hepr101.pdf', pdfPage: 35, readText: {} }}
      isMath={false}
      listenSteps={reasoning.steps}
      reasoning={reasoning}
      grade="Grade 8"
      subject="English"
      colors={colors}
      styles={styles}
      narration={narration}
      fontLarge={false}
      setFontLarge={jest.fn()}
      vocab={[]}
      vocabIndex={0}
      setVocabIndex={jest.fn()}
      pauseAnswer={null}
      setPauseAnswer={jest.fn()}
      whyOpen={false} setWhyOpen={jest.fn()}
      explainOpen={false} setExplainOpen={jest.fn()}
      hintOpen={false} setHintOpen={jest.fn()}
      exampleOpen={false} setExampleOpen={jest.fn()}
      setMode={jest.fn()}
      setZoomImage={jest.fn()}
    />,
  );
}

const selectedCards = () => [0, 1, 2, 3, 4].filter((i) => screen.getByTestId(`chain-card-${i}`).props.accessibilityState.selected);

describe('ListenTab with a reasoning-flow lesson', () => {
  test('renders the visual board next to the transcript', async () => {
    await renderAt(0);
    expect(screen.getByTestId('listen-visual-board')).toBeTruthy();
    expect(screen.getByText('Visual Logic Chain')).toBeTruthy();
    expect(screen.getByText('Book Follow-Along')).toBeTruthy();
  });

  test('no card is lit on the introduction and book-excerpt steps', async () => {
    await renderAt(0);
    expect(selectedCards()).toEqual([]);
  });

  test.each([[2, 0], [3, 1], [4, 2], [5, 3], [6, 4]])('narration step %i lights card %i', async (step, card) => {
    await renderAt(step);
    expect(selectedCards()).toEqual([card]);
  });
});
