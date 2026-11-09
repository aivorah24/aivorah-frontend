import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import StoryScreen from '../StoryScreen';
import * as api from '../../../../services/currentAffairsApi';

jest.mock('../../../../services/currentAffairsApi');
jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void) => ReactActual.useEffect(effect, [effect]) };
});
jest.mock('../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('../../../../components/common/Header', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return { __esModule: true, default: ({ title, onBack }: any) => <RNText onPress={onBack}>{`Header back: ${title}`}</RNText> };
});
jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#fff', cardDark: '#fff', borderColor: '#ddd', textMain: '#000', textHeading: '#000', textMuted: '#555', textDim: '#777', accentRed: '#c00',
  }, isDark: false }),
}));
let mockUser: any = { email: 'kid@school.in', grade: 'Grade 5' };
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mocked = api as jest.Mocked<typeof api>;

const STORY: api.Story = {
  id: 's1', category: 'world', publishDate: '2026-11-09',
  title: 'Thousands of New Sea Animals', summary: 'S',
  whatHappened: 'Scientists found over 5,000 species.', whyImportant: 'It helps protect the ocean.',
  didYouKnow: 'The Pacific is the largest ocean.',
  newWords: [{ word: 'Species', definition: 'A group of living things of the same kind.' }, { word: 'Deep sea', definition: 'The dark part of the ocean.' }],
  thinkAboutIt: 'Why are so many animals unknown?',
  imageUrl: null, source: 'Current Biology', sourceUrl: 'https://doi.org/10.1016/j.cub.2023.04.052', readTimeSeconds: 70,
};

const nav = (canGoBack = true) => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => canGoBack });
const route = (params: any = { storyId: 's1', ageGroup: '8-12' }) => ({ params });

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { email: 'kid@school.in', grade: 'Grade 5' };
  mocked.fetchStory.mockResolvedValue(STORY);
});

test('shows every section of the story format', async () => {
  await render(<StoryScreen navigation={nav()} route={route()} />);
  expect(await screen.findByText('Thousands of New Sea Animals')).toBeTruthy();
  expect(mocked.fetchStory).toHaveBeenCalledWith('s1', '8-12');
  for (const heading of ['What happened?', 'Why is it important?', 'Did you know?', 'Learn a new word', 'Think about it']) {
    expect(screen.getByText(heading)).toBeTruthy();
  }
  expect(screen.getByText('Scientists found over 5,000 species.')).toBeTruthy();
  expect(screen.getByText('It helps protect the ocean.')).toBeTruthy();
  expect(screen.getByText('The Pacific is the largest ocean.')).toBeTruthy();
  expect(screen.getByText('Species: ')).toBeTruthy();
  expect(screen.getByText('Deep sea: ')).toBeTruthy();
  expect(screen.getByText('Why are so many animals unknown?')).toBeTruthy();
  expect(screen.getByText('World')).toBeTruthy();
  expect(screen.getByText('1 min read · Current Biology')).toBeTruthy();
});

test('optional sections are left out when empty', async () => {
  mocked.fetchStory.mockResolvedValue({ ...STORY, didYouKnow: null, newWords: [], thinkAboutIt: null, sourceUrl: null });
  await render(<StoryScreen navigation={nav()} route={route()} />);
  await screen.findByText('What happened?');
  expect(screen.queryByText('Did you know?')).toBeNull();
  expect(screen.queryByText('Learn a new word')).toBeNull();
  expect(screen.queryByText('Think about it')).toBeNull();
  expect(screen.queryByText(/Read the original/)).toBeNull();
});

test('the original source opens in the browser', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
  await render(<StoryScreen navigation={nav()} route={route()} />);
  await fireEvent.press(await screen.findByText('Read the original at Current Biology'));
  expect(open).toHaveBeenCalledWith('https://doi.org/10.1016/j.cub.2023.04.052');
});

test('marking the story read awards 5 points', async () => {
  mocked.recordStoryRead.mockResolvedValue({ alreadyRead: false, pointsAwarded: 5, progress: {} as any });
  await render(<StoryScreen navigation={nav()} route={route()} />);
  await fireEvent.press(await screen.findByText('I’ve read this (+5 points)'));
  expect(mocked.recordStoryRead).toHaveBeenCalledWith('kid@school.in', '8-12', 's1', expect.any(Number));
  expect(await screen.findByText('Great reading! +5 points')).toBeTruthy();
  expect(screen.getByTestId('story-done')).toBeTruthy();
});

test('reading a story again earns nothing and says so', async () => {
  mocked.recordStoryRead.mockResolvedValue({ alreadyRead: true, pointsAwarded: 0, progress: {} as any });
  await render(<StoryScreen navigation={nav()} route={route()} />);
  await fireEvent.press(await screen.findByText('I’ve read this (+5 points)'));
  expect(await screen.findByText('You have read this story before.')).toBeTruthy();
});

test('a failed save shows the error', async () => {
  mocked.recordStoryRead.mockRejectedValue(new Error('Not signed in.'));
  await render(<StoryScreen navigation={nav()} route={route()} />);
  await fireEvent.press(await screen.findByText('I’ve read this (+5 points)'));
  expect(await screen.findByText('Not signed in.')).toBeTruthy();
});

test('the age group falls back to the profile grade', async () => {
  mockUser = { email: 'kid@school.in', grade: 'UKG' };
  await render(<StoryScreen navigation={nav()} route={route({ storyId: 's1' })} />);
  await screen.findByText('What happened?');
  expect(mocked.fetchStory).toHaveBeenCalledWith('s1', 'under-8');
});

test('back goes to the previous screen, or The World & You → Current Affairs when there is none', async () => {
  const withHistory = nav(true);
  await render(<StoryScreen navigation={withHistory} route={route()} />);
  await fireEvent.press(await screen.findByText('Header back: Current Affairs'));
  expect(withHistory.goBack).toHaveBeenCalled();

  const fresh = nav(false);
  await render(<StoryScreen navigation={fresh} route={route()} />);
  await fireEvent.press((await screen.findAllByText('Back to today’s stories'))[0]);
  expect(fresh.navigate).toHaveBeenCalledWith('WorldAndYou', { tab: 'news' });
});

test('no story id (e.g. an opened link without one) shows not found', async () => {
  await render(<StoryScreen navigation={nav()} route={route({})} />);
  expect(await screen.findByText('Story not found')).toBeTruthy();
  expect(mocked.fetchStory).not.toHaveBeenCalled();
});

test('a load error is shown', async () => {
  mocked.fetchStory.mockRejectedValue(new Error('Story not found'));
  await render(<StoryScreen navigation={nav()} route={route()} />);
  expect(await screen.findByText('Story not found')).toBeTruthy();
});
