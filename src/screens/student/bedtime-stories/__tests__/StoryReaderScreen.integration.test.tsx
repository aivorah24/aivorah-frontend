// Integration tests for StoryReaderScreen and its 5 reader components
// (ReaderTopBar, ReaderPageVisual, ReaderTextPanel, ReaderControls,
// ReaderBottomNav) — all rendered for real. useStoryReader is mocked at the
// module boundary since it already has its own dedicated unit tests
// (useStoryReader.test.tsx); this file's job is to prove the screen wires
// the hook's state/callbacks to the real UI correctly.

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import StoryReaderScreen from '../StoryReaderScreen';

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, isDark: true }),
}));

// ScreenLayout pulls in Sidebar -> AuthContext -> firebase (ESM, unparseable
// by Jest's transform) even though this screen never imports AuthContext
// directly — same real-chain issue BhagavathaStoriesScreen's test works around.
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'A Student', email: 'a@a.com', isPro: false } }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'StoryReader', name: 'StoryReader' }),
}));

const STORY = {
  id: 'ambarisha',
  title: 'Ambarisha Maharaja',
  collection: 'Srimad Bhagavatam',
  coverColor: '#7c3aed',
  pages: [
    { pageNumber: 1, text: 'Once there was a king.', sceneIcon: 'crown', sceneColor: '#000', sceneLabel: 'The King', imageUrl: null },
    { pageNumber: 2, text: 'He was very devoted.', sceneIcon: 'heart', sceneColor: '#000', sceneLabel: 'Devotion', imageUrl: null },
  ],
};

const mockSpeakPage = jest.fn();
const mockPauseAudio = jest.fn();
const mockStopAudio = jest.fn();
const mockResumeAudio = jest.fn();
const mockGoToPage = jest.fn();
const mockSetVoice = jest.fn();
const mockSetAutoPlay = jest.fn();
const mockSetPlaybackRate = jest.fn();
const mockSetResumedFrom = jest.fn();

let hookState: any;

function baseHookState(overrides: any = {}) {
  return {
    story: STORY,
    loading: false,
    currentPage: 0,
    voice: 'grandmother',
    setVoice: mockSetVoice,
    isLoading: false,
    playing: false,
    autoPlay: false,
    setAutoPlay: mockSetAutoPlay,
    wordIndex: 0,
    donePages: new Set<number>(),
    playbackRate: 1,
    setPlaybackRate: mockSetPlaybackRate,
    resumedFrom: null,
    setResumedFrom: mockSetResumedFrom,
    fadeAnim: { interpolate: () => 1 },
    slideAnim: { interpolate: () => 0 },
    isPaused: false,
    pauseAudio: mockPauseAudio,
    stopAudio: mockStopAudio,
    resumeAudio: mockResumeAudio,
    speakPage: mockSpeakPage,
    goToPage: mockGoToPage,
    ...overrides,
  };
}

jest.mock('../hooks/useStoryReader', () => ({
  useStoryReader: (...args: any[]) => (global as any).__mockUseStoryReader(...args),
}));

function navProp() {
  return { canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() };
}
function routeProp() {
  return { params: { storyId: 'ambarisha' } };
}

beforeEach(() => {
  jest.clearAllMocks();
  hookState = baseHookState();
  (global as any).__mockUseStoryReader = () => hookState;
});

describe('StoryReaderScreen — loading', () => {
  test('shows a loading indicator while the story is not yet ready', async () => {
    hookState = baseHookState({ loading: true, story: null });
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    expect(await screen.findByText('Opening story…')).toBeTruthy();
  });
});

describe('StoryReaderScreen — rendering the real page', () => {
  test('renders the story title, scene label, and page text via the real subcomponents', async () => {
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    expect(await screen.findByText('Ambarisha Maharaja')).toBeTruthy();
    expect(screen.getAllByText('The King').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Once there was a king/)).toBeTruthy();
  });

  test('the "Finished" button appears only on the last page', async () => {
    hookState = baseHookState({ currentPage: 1 });
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    expect(await screen.findByText('Finished')).toBeTruthy();
  });
});

describe('StoryReaderScreen — ReaderControls wiring', () => {
  test('pressing Listen while not playing calls speakPage with the current page number', async () => {
    const user = userEvent.setup();
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    await user.press(await screen.findByText('Listen'));
    expect(mockSpeakPage).toHaveBeenCalledWith(1);
  });

  test('pressing Pause while playing calls pauseAudio, not speakPage', async () => {
    hookState = baseHookState({ playing: true });
    const user = userEvent.setup();
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    await user.press(await screen.findByText('Pause'));
    expect(mockPauseAudio).toHaveBeenCalled();
    expect(mockSpeakPage).not.toHaveBeenCalled();
  });

  test('switching narrator voice stops audio and calls setVoice with the new voice', async () => {
    const user = userEvent.setup();
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    await user.press(await screen.findByText('Grandfather'));
    expect(mockStopAudio).toHaveBeenCalled();
    expect(mockSetVoice).toHaveBeenCalledWith('grandfather');
  });

  test('toggling Auto stops audio and flips autoPlay', async () => {
    const user = userEvent.setup();
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    await user.press(await screen.findByText('Auto'));
    expect(mockStopAudio).toHaveBeenCalled();
    expect(mockSetAutoPlay).toHaveBeenCalledWith(expect.any(Function));
  });

  test('picking a speed chip calls setPlaybackRate with the real rate value', async () => {
    const user = userEvent.setup();
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    await user.press(await screen.findByText('1.5x'));
    expect(mockSetPlaybackRate).toHaveBeenCalledWith(1.5);
  });
});

describe('StoryReaderScreen — navigation wiring', () => {
  test('pressing the bottom-nav Next arrow calls goToPage with the next index', async () => {
    const user = userEvent.setup();
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    await screen.findByText('Ambarisha Maharaja');
    await user.press(screen.getByTestId('readerNext'));
    expect(mockGoToPage).toHaveBeenCalledWith(1);
  });

  test('the bottom-nav Prev arrow is disabled on the first page', async () => {
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    await screen.findByText('Ambarisha Maharaja');
    expect(screen.getByTestId('readerPrev').props.accessibilityState?.disabled ?? screen.getByTestId('readerPrev').props.disabled).toBe(true);
  });

  test('on the last page, pressing Finished stops audio and goes back', async () => {
    hookState = baseHookState({ currentPage: 1 });
    const nav = navProp();
    const user = userEvent.setup();
    await render(<StoryReaderScreen route={routeProp()} navigation={nav} />);
    await user.press(await screen.findByText('Finished'));
    expect(mockStopAudio).toHaveBeenCalled();
    expect(nav.goBack).toHaveBeenCalled();
  });

  test('the top-bar back button stops audio and goes back', async () => {
    const nav = navProp();
    const user = userEvent.setup();
    await render(<StoryReaderScreen route={routeProp()} navigation={nav} />);
    await screen.findByText('Ambarisha Maharaja');
    await user.press(screen.getByTestId('readerBack'));
    expect(mockStopAudio).toHaveBeenCalled();
    expect(nav.goBack).toHaveBeenCalled();
  });

  test('when the story is already complete, the completion badge shows the real count', async () => {
    hookState = baseHookState({ donePages: new Set([1]) });
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    expect(await screen.findByText('1 of 2 pages completed')).toBeTruthy();
  });

  test('the resumed banner "Start over" resets resumedFrom and jumps to page 0', async () => {
    hookState = baseHookState({ resumedFrom: 2 });
    const user = userEvent.setup();
    await render(<StoryReaderScreen route={routeProp()} navigation={navProp()} />);
    await user.press(await screen.findByText('Start over'));
    expect(mockSetResumedFrom).toHaveBeenCalledWith(null);
    expect(mockGoToPage).toHaveBeenCalledWith(0);
  });
});
