import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import DigestScreen from '../DigestScreen';
import * as api from '../../../../services/currentAffairsApi';

jest.mock('../../../../services/currentAffairsApi');
jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void) => ReactActual.useEffect(effect, [effect]) };
});
jest.mock('../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('../../../../components/common/Header', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return { __esModule: true, default: ({ title, subtitle }: any) => <RNText>{title} | {subtitle}</RNText> };
});
jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#fff', cardDark: '#fff', borderColor: '#ddd', textMain: '#000', textHeading: '#000', textMuted: '#555', textDim: '#777', accentRed: '#c00',
  }, isDark: false }),
}));
let mockUser: any = { email: 'kid@school.in', grade: 'Grade 5' };
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mocked = api as jest.Mocked<typeof api>;

const story = (n: number, overrides: Partial<api.Story> = {}): api.Story => ({
  id: `s${n}`, category: 'science', publishDate: '2026-11-09', title: `Story ${n}`, summary: `Summary ${n}`,
  whatHappened: 'W', whyImportant: 'Y', didYouKnow: null, newWords: [], thinkAboutIt: null, imageUrl: null,
  source: 'NASA', sourceUrl: null, readTimeSeconds: 50, read: false, ...overrides,
});

const digest = (overrides: Partial<api.Digest> = {}): api.Digest => ({
  date: '2026-11-09', isToday: true, ageGroup: '8-12', target: 10,
  stories: [story(1, { read: true }), story(2, { category: 'india' })], readCount: 1, completed: false, ...overrides,
});

const progress = (overrides: Partial<api.Progress> = {}): api.Progress => ({
  studentEmail: 'kid@school.in', ageGroup: '8-12', points: 45, currentStreak: 3, longestStreak: 5,
  digestsCompleted: 4, storiesRead: 5, quizzesCompleted: 1, bestQuizScore: 80, lastQuizScore: 80,
  badges: { excellence: true, weeklyStreak: false, growth: true }, lastDigestDate: '2026-11-08', lastQuizDate: null,
  digestCompletedToday: false, ...overrides,
});

const nav = () => ({ navigate: jest.fn(), openDrawer: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { email: 'kid@school.in', grade: 'Grade 5' };
  mocked.fetchTodayDigest.mockResolvedValue(digest());
  mocked.fetchProgress.mockResolvedValue(progress());
});

test('shows a spinner while loading', async () => {
  mocked.fetchTodayDigest.mockReturnValue(new Promise(() => {}));
  await render(<DigestScreen navigation={nav()} />);
  expect(screen.getByTestId('digest-loading')).toBeTruthy();
});

test('shows the stories with category, source, read time and read checks', async () => {
  await render(<DigestScreen navigation={nav()} />);
  expect(await screen.findByText('Story 1')).toBeTruthy();
  expect(screen.getByText('Summary 2')).toBeTruthy();
  expect(screen.getByText('Science & Tech')).toBeTruthy();
  expect(screen.getByText('India')).toBeTruthy();
  expect(screen.getAllByText('50 sec read · NASA')).toHaveLength(2);
  expect(screen.getByTestId('story-read-s1')).toBeTruthy();
  expect(screen.getByTestId('story-unread-s2')).toBeTruthy();
  expect(screen.getByTestId('digest-read-count').props.children).toBe('1 of 2 stories read');
  expect(mocked.fetchTodayDigest).toHaveBeenCalledWith('8-12', 'kid@school.in');
  expect(mocked.fetchProgress).toHaveBeenCalledWith('kid@school.in', '8-12');
});

test('shows points, streak and badge count', async () => {
  await render(<DigestScreen navigation={nav()} />);
  expect(await screen.findByLabelText('45 Points')).toBeTruthy();
  expect(screen.getByLabelText('3 Day Streak')).toBeTruthy();
  expect(screen.getByLabelText('2 Badges')).toBeTruthy();
});

test.each([
  ['LKG', 'under-8', 'Ages 3-8'],
  ['Grade 8', '8-12', 'Ages 8-12'],
  ['Grade 11', '13+', 'Ages 13+'],
])('grade %s reads the %s digest', async (grade, ageGroup, label) => {
  mockUser = { email: 'kid@school.in', grade };
  await render(<DigestScreen navigation={nav()} />);
  await waitFor(() => expect(mocked.fetchTodayDigest).toHaveBeenCalledWith(ageGroup, 'kid@school.in'));
  expect(screen.getByText(label)).toBeTruthy();
});

test('opening a story and the weekly quiz pass the age group', async () => {
  const navigation = nav();
  await render(<DigestScreen navigation={navigation} />);
  await fireEvent.press(await screen.findByTestId('story-card-s2'));
  expect(navigation.navigate).toHaveBeenCalledWith('CurrentAffairsStory', { storyId: 's2', ageGroup: '8-12' });
  await fireEvent.press(screen.getByTestId('weekly-quiz-cta'));
  expect(navigation.navigate).toHaveBeenCalledWith('CurrentAffairsQuiz', { ageGroup: '8-12' });
});

test('finishing the digest awards 10 points and marks it complete', async () => {
  mocked.recordDigestComplete.mockResolvedValue({
    alreadyCompleted: false, pointsAwarded: 10, newBadges: [], progress: progress({ points: 55, currentStreak: 4 }),
  });
  await render(<DigestScreen navigation={nav()} />);
  await fireEvent.press(await screen.findByText('I’ve read all stories (+10 points)'));
  expect(mocked.recordDigestComplete).toHaveBeenCalledWith('kid@school.in', '8-12', 2);
  expect(await screen.findByText('Well done! +10 points')).toBeTruthy();
  expect(screen.getByTestId('digest-completed')).toBeTruthy();
  expect(screen.getByLabelText('55 Points')).toBeTruthy();
});

test('a 7-day streak is celebrated', async () => {
  mocked.recordDigestComplete.mockResolvedValue({
    alreadyCompleted: false, pointsAwarded: 10, newBadges: ['weekly_streak'], progress: progress({ currentStreak: 7 }),
  });
  await render(<DigestScreen navigation={nav()} />);
  await fireEvent.press(await screen.findByText('I’ve read all stories (+10 points)'));
  expect(await screen.findByText('Well done! +10 points and a 7-day streak badge!')).toBeTruthy();
});

test('an already finished digest shows as complete, without the button', async () => {
  mocked.fetchTodayDigest.mockResolvedValue(digest({ completed: true }));
  await render(<DigestScreen navigation={nav()} />);
  expect(await screen.findByTestId('digest-completed')).toBeTruthy();
  expect(screen.queryByText('I’ve read all stories (+10 points)')).toBeNull();
});

test('says when it is showing an earlier digest', async () => {
  mocked.fetchTodayDigest.mockResolvedValue(digest({ date: '2026-11-07', isToday: false }));
  await render(<DigestScreen navigation={nav()} />);
  expect(await screen.findByText(/No new stories yet today — here is the digest from/)).toBeTruthy();
});

test('empty digest', async () => {
  mocked.fetchTodayDigest.mockResolvedValue(digest({ date: null, stories: [], readCount: 0 }));
  await render(<DigestScreen navigation={nav()} />);
  expect(await screen.findByText('No stories yet')).toBeTruthy();
  expect(screen.queryByText('I’ve read all stories (+10 points)')).toBeNull();
});

test('a failed load shows the error and can be retried', async () => {
  mocked.fetchTodayDigest.mockRejectedValueOnce(new Error('Could not load today’s stories (502)'));
  await render(<DigestScreen navigation={nav()} />);
  expect(await screen.findByText('Could not load today’s stories (502)')).toBeTruthy();
  await fireEvent.press(screen.getByText('Try again'));
  expect(await screen.findByText('Story 1')).toBeTruthy();
});

test('pull to refresh reloads the digest', async () => {
  await render(<DigestScreen navigation={nav()} />);
  await screen.findByText('Story 1');
  mocked.fetchTodayDigest.mockResolvedValueOnce(digest({ stories: [story(3)] }));
  const scroll = screen.getByTestId('digest-scroll');
  await act(async () => { await scroll.props.refreshControl.props.onRefresh(); });
  expect(await screen.findByText('Story 3')).toBeTruthy();
});

test('progress failing does not hide the stories', async () => {
  mocked.fetchProgress.mockRejectedValueOnce(new Error('403'));
  await render(<DigestScreen navigation={nav()} />);
  expect(await screen.findByText('Story 1')).toBeTruthy();
  expect(screen.getByLabelText('0 Points')).toBeTruthy();
});

// Keep the Text import used for JSX in mocks.
void Text;
