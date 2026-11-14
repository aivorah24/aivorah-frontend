import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import CurrentAffairsAdminScreen from '../../CurrentAffairsAdminScreen';

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, colors: { primary: '#5E7566', accentGreen: '#5E7566', accentYellow: '#c90', accentRed: '#e33', textDim: '#999', textMain: '#111', textMuted: '#666', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
jest.mock('../../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../../services/currentAffairsAdminService', () => ({
  listStories: jest.fn(), getStory: jest.fn(), createStory: jest.fn(), updateStory: jest.fn(), setStoryStatus: jest.fn(),
  listQuizWeeks: jest.fn(), getQuiz: jest.fn(), updateQuestion: jest.fn(), addQuestion: jest.fn(), setQuestionStatus: jest.fn(),
  publishQuiz: jest.fn(), getAnalytics: jest.fn(),
}));
import * as api from '../../services/currentAffairsAdminService';
const mocked = api as jest.Mocked<typeof api>;

const AGES = ['young', 'kid', 'teen'];
const PARTS = ['title', 'summary', 'what_happened', 'why_important'];
const story = (over: any = {}) => {
  const s: any = {
    id: 's1', category: 'science', publish_date: '2026-11-14', status: 'review', priority: 10,
    source: 'NASA', source_url: 'https://www.nasa.gov/x', review_notes: 'names not in source: Artemis', is_true_fact: false,
    reviewed_by: null, reviewed_at: null, did_you_know: 'A fact.', think_about_it: 'Why?',
    new_word_1: 'Orbit', def_1: 'A path.', new_word_2: null, def_2: null, new_word_3: null, def_3: null, image_url: null,
  };
  for (const p of PARTS) for (const a of AGES) s[`${p}_${a}`] = `${p} ${a}`;
  s.title_kid = 'NASA tests a new rocket';
  return { ...s, ...over };
};
const question = (n: number, over: any = {}) => ({
  id: `q${n}`, week_start: '2026-11-08', age_group: '8-12', category: 'india', question_type: 'mcq',
  question: `Question ${n}?`, options: ['A', 'B', 'C', 'D'], correct_index: 0, explanation: 'Because.', extra_fact: null,
  status: 'review', position: n, review_notes: null, ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mocked.listStories.mockResolvedValue([story()]);
  mocked.getStory.mockResolvedValue(story());
  mocked.listQuizWeeks.mockResolvedValue({ currentWeek: '2026-11-08', weeks: [] });
  mocked.getQuiz.mockResolvedValue([question(1), question(2)]);
});

test('the review queue shows waiting stories with their check notes', async () => {
  await render(<CurrentAffairsAdminScreen />);
  expect(await screen.findByText('NASA tests a new rocket')).toBeTruthy();
  expect(screen.getByText('names not in source: Artemis')).toBeTruthy();
  expect(mocked.listStories).toHaveBeenCalledWith('review');
});

test('an editor fixes a story and publishes it', async () => {
  const user = userEvent.setup();
  mocked.updateStory.mockImplementation(async (_id, fields) => story(fields));
  mocked.setStoryStatus.mockResolvedValue(story({ title_kid: 'NASA tests its Artemis rocket', status: 'published', reviewed_by: 'admin@aivorah.ai' }));
  await render(<CurrentAffairsAdminScreen />);
  await user.press(await screen.findByTestId('ca-story-row-s1'));
  const title = await screen.findByTestId('ca-story-title_kid');
  await user.clear(title);
  await user.type(title, 'NASA tests its Artemis rocket');
  await user.press(screen.getByTestId('ca-story-publish'));

  await waitFor(() => expect(mocked.setStoryStatus).toHaveBeenCalledWith('s1', 'published'));
  expect(mocked.updateStory).toHaveBeenCalledWith('s1', expect.objectContaining({ title_kid: 'NASA tests its Artemis rocket', category: 'science', priority: 10 }));
  expect(await screen.findByText('Published: students can read it now.')).toBeTruthy();
  expect(mocked.listStories).toHaveBeenCalledTimes(2); // the list refreshes
});

test('a new story shows the server\'s error when a part is missing', async () => {
  const user = userEvent.setup();
  mocked.createStory.mockRejectedValue(new Error('why_important_teen is required'));
  await render(<CurrentAffairsAdminScreen />);
  await user.press(await screen.findByTestId('ca-story-new'));
  await user.type(await screen.findByTestId('ca-story-title_kid'), 'My story');
  await user.press(screen.getByTestId('ca-story-save'));
  expect(await screen.findByText('why_important_teen is required')).toBeTruthy();
  expect(mocked.createStory).toHaveBeenCalledWith(expect.objectContaining({ title_kid: 'My story', category: 'india' }));
});

test("the weekly quiz: edit a question's right answer, then publish the week", async () => {
  const user = userEvent.setup();
  mocked.updateQuestion.mockImplementation(async (id, fields) => question(2, { ...fields, id }));
  mocked.publishQuiz.mockResolvedValue({ published: 2 });
  await render(<CurrentAffairsAdminScreen />);
  await user.press(await screen.findByTestId('ca-tab-quiz'));

  expect(await screen.findByText('Week of 2026-11-08 (this week)')).toBeTruthy();
  expect(screen.getByTestId('ca-quiz-summary').props.children).toBe('2 questions · 0 published · 2 waiting for review');
  await user.press(screen.getByTestId('ca-q-q2-correct-2'));
  await user.press(screen.getByTestId('ca-q-q2-save'));
  await waitFor(() => expect(mocked.updateQuestion).toHaveBeenCalledWith('q2', expect.objectContaining({ correct_index: 2, options: ['A', 'B', 'C', 'D'] })));

  await user.press(screen.getByTestId('ca-quiz-publish'));
  await waitFor(() => expect(mocked.publishQuiz).toHaveBeenCalledWith('2026-11-08', '8-12'));
  expect(await screen.findByText('Published 2 questions: students can play the quiz now.')).toBeTruthy();

  await user.press(screen.getByTestId('ca-quiz-prev'));
  await waitFor(() => expect(mocked.getQuiz).toHaveBeenLastCalledWith('2026-11-01', '8-12'));
});

test('insights show the metrics, with a dash where there is no data yet', async () => {
  const user = userEvent.setup();
  const m = (value: number | null, unit: string) => ({ value, unit });
  mocked.getAnalytics.mockResolvedValue({
    range: { from: '2026-10-16', to: '2026-11-14', days: 30, ageGroup: 'all' },
    activeStudents: 42,
    metrics: {
      digestCompletionRate: m(61.5, '%'), avgReadingSeconds: m(48, 's'), avgMinutesPerDay: m(4.2, 'min'),
      quizParticipation: m(35, '%'), quizAccuracy: m(72.4, '%'), retention30: m(null, '%'),
      dailyActiveReaders: m(12.3, 'students'), avgStreak: m(2.5, 'days'),
    },
    daily: [{ date: '2026-11-14', readers: 9, storiesRead: 30, digestsCompleted: 5 }],
  } as any);
  await render(<CurrentAffairsAdminScreen />);
  await user.press(await screen.findByTestId('ca-tab-insights'));

  expect(await screen.findByText('61.5%')).toBeTruthy();
  expect(screen.getByText('48 s')).toBeTruthy();
  expect(screen.getByText('4.2 min')).toBeTruthy();
  expect(screen.getByText('—')).toBeTruthy(); // retention: no earlier month yet
  expect(screen.getByTestId('ca-day-2026-11-14')).toBeTruthy();

  await user.press(screen.getByTestId('ca-insights-age-8-12'));
  await waitFor(() => expect(mocked.getAnalytics).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), '8-12'));
});
