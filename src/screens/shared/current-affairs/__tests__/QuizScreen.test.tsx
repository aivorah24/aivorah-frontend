import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import QuizScreen from '../QuizScreen';
import * as api from '../../../../services/currentAffairsApi';

jest.mock('../../../../services/currentAffairsApi');
jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void) => ReactActual.useEffect(effect, [effect]) };
});
jest.mock('../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('../../../../components/common/Header', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return { __esModule: true, default: ({ title }: any) => <RNText>{title}</RNText> };
});
jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#fff', cardDark: '#fff', borderColor: '#ddd', textMain: '#000', textHeading: '#000', textMuted: '#555', textDim: '#777', accentRed: '#c00',
  }, isDark: false }),
}));
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: { email: 'kid@school.in', grade: 'Grade 5' } }) }));

const mocked = api as jest.Mocked<typeof api>;

const PLAN: [api.Category, api.QuestionType][] = [
  ['india', 'mcq'], ['india', 'true_false'], ['world', 'mcq'], ['world', 'reasoning'], ['science', 'mcq'],
  ['science', 'true_false'], ['economy', 'mcq'], ['environment', 'mcq'], ['sports', 'mcq'], ['society', 'reasoning'],
];
const QUESTIONS: api.QuizQuestion[] = PLAN.map(([category, type], i) => ({
  id: `q${i + 1}`, category, type, question: `Question ${i + 1}?`,
  options: type === 'true_false' ? ['True', 'False'] : ['Alpha', 'Bravo', 'Charlie', 'Delta'],
  storyId: i === 0 ? 's1' : null,
}));
const CORRECT = 1; // every question's right answer in these tests

const quiz = (overrides: Partial<api.Quiz> = {}): api.Quiz => ({
  weekStart: '2026-11-08', ageGroup: '8-12', total: 10, questions: QUESTIONS, attempt: null, ...overrides,
});

function resultFor(chosen: number[]): api.QuizResult {
  const results = QUESTIONS.map((q, i) => ({
    questionId: q.id, category: q.category, type: q.type, question: q.question, options: q.options,
    selected: chosen[i], correct: chosen[i] === CORRECT, correctIndex: CORRECT,
    explanation: `Because ${i + 1}.`, extraFact: null, storyId: null,
  }));
  const score = results.filter((r) => r.correct).length;
  return { attemptId: 'att-1', weekStart: '2026-11-08', score, total: 10, percentage: score * 10, excellence: score >= 8, pointsAwarded: false, results };
}

const nav = () => ({ navigate: jest.fn() });
const route = { params: { ageGroup: '8-12' } };

beforeEach(() => {
  jest.clearAllMocks();
  mocked.fetchWeeklyQuiz.mockResolvedValue(quiz());
  mocked.checkQuizAnswer.mockImplementation(async (questionId, answer) => ({
    questionId, selected: answer, correct: answer === CORRECT, correctIndex: CORRECT,
    explanation: `Explanation for ${questionId}.`, extraFact: `Extra fact for ${questionId}.`, storyId: questionId === 'q1' ? 's1' : null,
  }));
});

// Answers all 10 questions, the first `right` of them correctly.
async function playQuiz(right: number) {
  for (let i = 0; i < 10; i++) {
    expect(await screen.findByText(`Question ${i + 1} of 10`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`option-${i < right ? CORRECT : 0}`));
    await fireEvent.press(screen.getByText('Check Answer'));
    await screen.findByTestId('answer-feedback');
    await fireEvent.press(screen.getByText(i === 9 ? 'Submit Quiz' : 'Next Question'));
  }
}

test('shows one question at a time with lettered options', async () => {
  await render(<QuizScreen navigation={nav()} route={route} />);
  expect(await screen.findByText('Question 1 of 10')).toBeTruthy();
  expect(mocked.fetchWeeklyQuiz).toHaveBeenCalledWith('8-12', 'kid@school.in');
  expect(screen.getByText('Question 1?')).toBeTruthy();
  expect(screen.getByText('Multiple choice')).toBeTruthy();
  expect(screen.getByText('India')).toBeTruthy();
  for (const letter of ['A', 'B', 'C', 'D']) expect(screen.getByText(letter)).toBeTruthy();
  expect(screen.queryByText('Question 2?')).toBeNull();
});

test('Check Answer reveals the correct answer, explanation, extra fact and story link', async () => {
  const navigation = nav();
  await render(<QuizScreen navigation={navigation} route={route} />);
  await screen.findByText('Question 1 of 10');
  await fireEvent.press(screen.getByText('Check Answer')); // nothing chosen yet → disabled
  expect(mocked.checkQuizAnswer).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByTestId('option-0'));
  await fireEvent.press(screen.getByText('Check Answer'));
  expect(mocked.checkQuizAnswer).toHaveBeenCalledWith('q1', 0);
  expect(await screen.findByText('Not quite — the answer is B: Bravo')).toBeTruthy();
  expect(screen.getByText('Explanation for q1.')).toBeTruthy();
  expect(screen.getByText(/Extra fact for q1./)).toBeTruthy();
  await fireEvent.press(screen.getByText('Read the story'));
  expect(navigation.navigate).toHaveBeenCalledWith('CurrentAffairsStory', { storyId: 's1', ageGroup: '8-12' });

  await fireEvent.press(screen.getByText('Next Question'));
  expect(await screen.findByText('Question 2 of 10')).toBeTruthy();
  expect(screen.getByText('True or false')).toBeTruthy();
  await fireEvent.press(screen.getByTestId(`option-${CORRECT}`));
  await fireEvent.press(screen.getByText('Check Answer'));
  expect(await screen.findByText('Correct!')).toBeTruthy();
});

test('80%+: submits, records completion, shows score, points and the excellence badge', async () => {
  mocked.submitQuiz.mockImplementation(async (_e, _a, answers) => resultFor(answers.map((a) => a.answer)));
  mocked.recordQuizComplete.mockResolvedValue({
    alreadyRecorded: false, pointsAwarded: 30, newBadges: ['excellence'], percentage: 80, excellence: true, progress: {} as any,
  });
  const navigation = nav();
  await render(<QuizScreen navigation={navigation} route={route} />);
  await playQuiz(8);

  expect(await screen.findByTestId('quiz-result')).toBeTruthy();
  const [email, ageGroup, answers, weekStart] = mocked.submitQuiz.mock.calls[0];
  expect([email, ageGroup, weekStart]).toEqual(['kid@school.in', '8-12', '2026-11-08']);
  expect(answers).toHaveLength(10);
  expect(answers[0]).toEqual({ questionId: 'q1', answer: CORRECT });
  expect(mocked.recordQuizComplete).toHaveBeenCalledWith('kid@school.in', '8-12', 'att-1');

  expect(screen.getByText('8/10')).toBeTruthy();
  expect(screen.getByText('80%')).toBeTruthy();
  expect(screen.getByText('+30 points')).toBeTruthy();
  expect(screen.getByTestId('excellence-badge')).toBeTruthy();
  // Review lists every question; wrong ones show the correct answer.
  expect(screen.getByText('10. Question 10?')).toBeTruthy();
  expect(screen.getAllByText('Correct answer: B. Bravo')).toHaveLength(2);

  await fireEvent.press(screen.getByText('Try Again Next Week'));
  // Opened without history (e.g. a link) → The World & You → Current Affairs tab.
  expect(navigation.navigate).toHaveBeenCalledWith('WorldAndYou', { tab: 'news' });
});

test('below 80%: no excellence badge, still +20 points', async () => {
  mocked.submitQuiz.mockImplementation(async (_e, _a, answers) => resultFor(answers.map((a) => a.answer)));
  mocked.recordQuizComplete.mockResolvedValue({
    alreadyRecorded: false, pointsAwarded: 20, newBadges: ['growth'], percentage: 50, excellence: false, growth: true, progress: {} as any,
  });
  await render(<QuizScreen navigation={nav()} route={route} />);
  await playQuiz(5);
  expect(await screen.findByText('5/10')).toBeTruthy();
  expect(screen.getByText('+20 points')).toBeTruthy();
  expect(screen.queryByTestId('excellence-badge')).toBeNull();
  expect(screen.getByText('Growth badge — you beat your last score!')).toBeTruthy();
});

test('if saving the points fails the result is still shown', async () => {
  mocked.submitQuiz.mockImplementation(async (_e, _a, answers) => resultFor(answers.map((a) => a.answer)));
  mocked.recordQuizComplete.mockRejectedValue(new Error('Could not save your quiz points'));
  await render(<QuizScreen navigation={nav()} route={route} />);
  await playQuiz(10);
  expect(await screen.findByText('10/10')).toBeTruthy();
  expect(screen.getByText('Could not save your quiz points')).toBeTruthy();
});

test('Try Again Next Week goes back to where the student came from', async () => {
  mocked.fetchWeeklyQuiz.mockResolvedValue(quiz({ attempt: resultFor([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]) }));
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };
  await render(<QuizScreen navigation={navigation} route={route} />);
  await fireEvent.press(await screen.findByText('Try Again Next Week'));
  expect(navigation.goBack).toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
});

test('a quiz already taken this week opens on its result', async () => {
  mocked.fetchWeeklyQuiz.mockResolvedValue(quiz({ attempt: resultFor([1, 1, 1, 1, 1, 1, 0, 0, 0, 0]) }));
  await render(<QuizScreen navigation={nav()} route={route} />);
  expect(await screen.findByText('6/10')).toBeTruthy();
  expect(screen.getByText('You already took this week’s quiz — here is your result.')).toBeTruthy();
  expect(screen.getByText('Try Again Next Week')).toBeTruthy();
  expect(screen.queryByText('Check Answer')).toBeNull();
});

test('no quiz yet this week', async () => {
  mocked.fetchWeeklyQuiz.mockResolvedValue(quiz({ total: 0, questions: [] }));
  await render(<QuizScreen navigation={nav()} route={route} />);
  expect(await screen.findByTestId('quiz-empty')).toBeTruthy();
  expect(screen.getByText('This week’s quiz isn’t ready yet')).toBeTruthy();
});

test('loading and load errors', async () => {
  mocked.fetchWeeklyQuiz.mockReturnValueOnce(new Promise(() => {}));
  await render(<QuizScreen navigation={nav()} route={route} />);
  expect(screen.getByTestId('quiz-loading')).toBeTruthy();
});

test('a failed load can be retried', async () => {
  mocked.fetchWeeklyQuiz.mockRejectedValueOnce(new Error('Could not load this week’s quiz (502)'));
  await render(<QuizScreen navigation={nav()} route={route} />);
  expect(await screen.findByText('Could not load this week’s quiz (502)')).toBeTruthy();
  await fireEvent.press(screen.getByText('Try again'));
  expect(await screen.findByText('Question 1 of 10')).toBeTruthy();
});

test('a failed submit keeps the student on the last question with the error', async () => {
  mocked.submitQuiz.mockRejectedValue(new Error('Not signed in.'));
  await render(<QuizScreen navigation={nav()} route={route} />);
  await playQuiz(3);
  expect(await screen.findByText('Not signed in.')).toBeTruthy();
  expect(screen.getByText('Submit Quiz')).toBeTruthy();
  expect(mocked.recordQuizComplete).not.toHaveBeenCalled();
});
