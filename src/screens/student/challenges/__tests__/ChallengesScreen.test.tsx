// Integration tests for ChallengesScreen — the real screen and all its real
// subcomponents (StatsRow, LeaderboardCTA, ChallengeTabs, ChallengesGrid,
// ChallengeCard, QuizModal + its children), with useChallengesList and
// useQuizSession mocked at the module boundary (each already has its own
// dedicated hook tests).

import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import ChallengesScreen from '../ChallengesScreen';
import type { Challenge } from '../types';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Challenges', name: 'Challenges' }),
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', accentYellow: '#fa0', accentGreen: '#0a0', accentRed: '#f00', textMain: '#fff',
    textMuted: '#888', textDim: '#666', borderColor: '#333', cardDark: '#111', cardHover: '#222',
  } }),
}));

const mockAddXP = jest.fn();
const mockRecordStudySeconds = jest.fn();
jest.mock('../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({
    stats: { xpPoints: 500, challengesCompleted: 3, completedTopics: ['a', 'b'], currentStreak: 4 },
    studentId: 's1', addXP: mockAddXP, recordStudySeconds: mockRecordStudySeconds,
  }),
}));

const mockRefreshProfile = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'A Student', email: 'a@a.com', grade: 'Grade 4', curriculum: 'NCERT' }, refreshProfile: mockRefreshProfile }),
}));

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'c1', title: 'Fractions Quiz', description: '', grade: 'Grade 4', curriculum: 'NCERT',
    subject: 'Math', chapterId: null, topic: 'Fractions', difficulty: 'Easy', xpReward: 100,
    questionCount: 5, timeLimitMinutes: 10, type: 'mcq', category: 'quiz', imageUrl: null,
    assignmentId: null, status: 'available', score: null, xpAwarded: null, dueDate: null,
    assignedByRole: null, ...overrides,
  } as Challenge;
}

let listState: any;
const mockSetActiveTab = jest.fn();
const mockFetchChallenges = jest.fn();
const mockSetChallenges = jest.fn();

function baseListState(overrides: any = {}) {
  return {
    activeTab: 'Available', setActiveTab: mockSetActiveTab,
    challenges: [makeChallenge()], setChallenges: mockSetChallenges,
    loading: false, refreshing: false,
    fetchChallenges: mockFetchChallenges,
    filtered: [makeChallenge()],
    counts: { available: 1, assigned: 0, completed: 0 },
    ...overrides,
  };
}
jest.mock('../hooks/useChallengesList', () => ({
  useChallengesList: (...args: any[]) => (global as any).__mockUseChallengesList(...args),
}));

let quizState: any;
const mockStartChallenge = jest.fn();
const mockSubmitQuiz = jest.fn();
const mockCloseQuiz = jest.fn();
const mockSetAnswers = jest.fn();

function baseQuizState(overrides: any = {}) {
  return {
    quizVisible: false, activeChallenge: null, questions: [], answers: [], setAnswers: mockSetAnswers,
    quizLoading: false, quizSubmitting: false, quizResult: null, timeLeft: null,
    leaderboard: [], leaderLoading: false, allAnswered: false,
    startChallenge: mockStartChallenge, submitQuiz: mockSubmitQuiz, closeQuiz: mockCloseQuiz,
    ...overrides,
  };
}
jest.mock('../hooks/useQuizSession', () => ({
  useQuizSession: (...args: any[]) => (global as any).__mockUseQuizSession(...args),
}));

function navProp() {
  return { navigate: jest.fn(), openDrawer: jest.fn(), setParams: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  listState = baseListState();
  quizState = baseQuizState();
  (global as any).__mockUseChallengesList = () => listState;
  (global as any).__mockUseQuizSession = () => quizState;
  // ScreenLayout (real, not mocked) gates all children behind its own
  // screen-time-status fetch for student users.
  global.fetch = jest.fn().mockResolvedValue({ json: async () => ({}) });
});

describe('ChallengesScreen — stats and leaderboard CTA', () => {
  test('shows the real stats from StudentDataContext', async () => {
    await render(<ChallengesScreen navigation={navProp()} route={{}} />);
    expect(await screen.findByText('500')).toBeTruthy();
    expect(screen.getByText('4d')).toBeTruthy();
  });

  test('pressing the leaderboard CTA navigates to the real Leaderboard screen', async () => {
    const nav = navProp();
    const user = userEvent.setup();
    await render(<ChallengesScreen navigation={nav} route={{}} />);

    await user.press(await screen.findByText('Live Class Leaderboard'));

    expect(nav.navigate).toHaveBeenCalledWith('Leaderboard');
  });
});

describe('ChallengesScreen — tabs and grid', () => {
  test('renders the real challenge cards for the current tab', async () => {
    await render(<ChallengesScreen navigation={navProp()} route={{}} />);
    expect(await screen.findByText('Fractions Quiz')).toBeTruthy();
  });

  test('pressing a tab calls the real setActiveTab from the hook', async () => {
    const user = userEvent.setup();
    await render(<ChallengesScreen navigation={navProp()} route={{}} />);

    await user.press(await screen.findByText('Assigned'));

    expect(mockSetActiveTab).toHaveBeenCalledWith('Assigned');
  });

  test('pressing "Start Challenge" calls the real startChallenge with the challenge object', async () => {
    const user = userEvent.setup();
    await render(<ChallengesScreen navigation={navProp()} route={{}} />);

    await user.press(await screen.findByText('Start Challenge'));

    expect(mockStartChallenge).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  test('shows a real empty state when there are no filtered challenges', async () => {
    listState = baseListState({ filtered: [], counts: { available: 0, assigned: 0, completed: 0 } });
    await render(<ChallengesScreen navigation={navProp()} route={{}} />);
    expect(await screen.findByText('No challenges available')).toBeTruthy();
  });
});

describe('ChallengesScreen — quiz modal wiring', () => {
  test('the quiz questions render inside the real modal when quizVisible is true', async () => {
    quizState = baseQuizState({
      quizVisible: true,
      activeChallenge: makeChallenge(),
      questions: [{ question: 'What is 2+2?', options: ['3', '4'], answer: '4', type: 'mcq' }],
      answers: [null],
    });
    await render(<ChallengesScreen navigation={navProp()} route={{}} />);
    expect(await screen.findByText('What is 2+2?')).toBeTruthy();
  });

  test('the real quiz result screen renders when quizResult is set', async () => {
    quizState = baseQuizState({ quizVisible: true, activeChallenge: makeChallenge(), quizResult: { score: 90, xpAwarded: 90 } });
    await render(<ChallengesScreen navigation={navProp()} route={{}} />);
    expect(await screen.findByText('90%')).toBeTruthy();
  });
});

describe('ChallengesScreen — completion callback', () => {
  test('onChallengeCompleted (passed into useQuizSession) marks the real matching challenge as completed via setChallenges', async () => {
    let capturedArgs: any;
    (global as any).__mockUseQuizSession = (args: any) => { capturedArgs = args; return quizState; };

    await render(<ChallengesScreen navigation={navProp()} route={{}} />);
    await screen.findByText('Fractions Quiz');

    capturedArgs.onChallengeCompleted('c1', 90, 90);

    expect(mockSetChallenges).toHaveBeenCalledWith(expect.any(Function));
    const updater = mockSetChallenges.mock.calls[0][0];
    const result = updater([makeChallenge({ id: 'c1', status: 'available' }), makeChallenge({ id: 'c2', status: 'available' })]);
    expect(result).toEqual([
      expect.objectContaining({ id: 'c1', status: 'completed', score: 90, xpAwarded: 90 }),
      expect.objectContaining({ id: 'c2', status: 'available' }),
    ]);
  });
});

describe('ChallengesScreen — deep-link highlight', () => {
  test('a highlightId matching a real loaded challenge auto-opens the quiz', async () => {
    const nav = navProp();
    await render(<ChallengesScreen navigation={nav} route={{ params: { highlightId: 'c1' } }} />);

    await waitFor(() => expect(mockStartChallenge).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' })));
    expect(nav.setParams).toHaveBeenCalledWith({ highlightId: undefined });
  });

  test('a highlightId with no matching challenge does not attempt to start anything', async () => {
    const nav = navProp();
    await render(<ChallengesScreen navigation={nav} route={{ params: { highlightId: 'ghost-id' } }} />);

    await screen.findByText('Fractions Quiz');
    expect(mockStartChallenge).not.toHaveBeenCalled();
  });
});
