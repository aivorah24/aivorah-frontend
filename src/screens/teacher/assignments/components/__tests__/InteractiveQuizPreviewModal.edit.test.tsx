import React from 'react';
import { render, screen, userEvent, act } from '@testing-library/react-native';
import { InteractiveQuizPreviewModal } from '../InteractiveQuizPreviewModal';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

// The Edit tab: a teacher fixes what the AI got wrong - question text, answers,
// options, hint, solution, and pictures - and every change is kept at once
// and shown in Preview. MHLE-31 Task 3: the matching chart landed in item a)'s
// answer box instead of above the task.
const generated = () => ({
  _editMode: true,
  _normalized: true,
  _previewHTML: null,
  tasks: [
    {
      tier: 'COULD DO',
      title: 'Task 3: Match the length and width to the area and perimeter of each shape.',
      questions: [
        { id: 'a', question: '1) Length = 2, Width = 2', answer: 'Area = 4, Perimeter = 8', imageUrl: 'https://x.test/chart.png' },
        { id: 'b', question: '2) Length = 5, Width = 5', answer: 'Area = 25, Perimeter = 20' },
      ],
    },
    {
      tier: 'MUST DO',
      title: 'Task 4: Choose',
      questions: [{ question: 'Which is a square?', type: 'mcq', answer: 'A', options: ['A', 'B'] }],
    },
  ],
});

let latest: any;
function Harness() {
  const [quiz, setQuiz] = React.useState<any>(() => (latest = generated()));
  const keep = (next: any) => { latest = next; setQuiz(next); };
  return <InteractiveQuizPreviewModal quiz={quiz} setQuiz={keep} onClose={jest.fn()} />;
}

beforeEach(() => {
  jest.useFakeTimers();
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '<html>edited</html>' });
});
afterEach(() => jest.useRealTimers());

test('the tab is called Edit and says changes are saved', async () => {
  await render(<Harness />);
  expect(screen.getByText('Edit')).toBeTruthy();
  expect(screen.queryByText('Edit Answers')).toBeNull();
  expect(screen.getByTestId('quiz-edit-saved')).toBeTruthy();
});

test('question, answer, hint and solution are edited in place', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await render(<Harness />);
  await user.clear(screen.getByTestId('edit-q-0-1-question'));
  await user.type(screen.getByTestId('edit-q-0-1-question'), '2) Length = 3, Width = 4');
  await user.clear(screen.getByTestId('edit-q-0-1-answer'));
  await user.type(screen.getByTestId('edit-q-0-1-answer'), 'Area = 12');
  await user.type(screen.getByTestId('edit-q-0-1-hint'), 'Multiply');
  await user.type(screen.getByTestId('edit-q-0-1-solution'), '3 x 4');
  expect(latest.tasks[0].questions[1]).toMatchObject({
    question: '2) Length = 3, Width = 4', answer: 'Area = 12', hint: 'Multiply', solution: '3 x 4',
  });
});

test('a picture in an answer box is moved up to the task, and Preview is rebuilt with it', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await render(<Harness />);
  await user.press(screen.getByTestId('edit-q-0-0-picture-move'));
  await user.press(screen.getByText('Task picture (above the questions)'));
  expect(latest.tasks[0].sharedImageUrl).toBe('https://x.test/chart.png');
  expect(latest.tasks[0].questions[0].imageUrl).toBeUndefined();
  expect(screen.getByTestId('edit-task-0-picture')).toBeTruthy();
  expect(screen.getByTestId('edit-q-0-0-picture-add')).toBeTruthy();

  await act(async () => { jest.advanceTimersByTime(1000); });
  const sent = JSON.parse((global as any).fetch.mock.calls.at(-1)[1].body).quiz;
  expect(sent.tasks[0].sharedImageUrl).toBe('https://x.test/chart.png');
  expect(latest._previewHTML).toBe('<html>edited</html>');
});

test('a picture can be removed', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await render(<Harness />);
  await user.press(screen.getByTestId('edit-q-0-0-picture-remove'));
  expect(latest.tasks[0].questions[0].imageUrl).toBeUndefined();
});

test('multiple choice: options are editable and the correct one can be changed', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await render(<Harness />);
  await user.press(screen.getByTestId('edit-q-1-0-option-1-correct'));
  expect(latest.tasks[1].questions[0].answer).toBe('B');
  await user.type(screen.getByTestId('edit-q-1-0-option-1'), ' (square)');
  expect(latest.tasks[1].questions[0]).toMatchObject({ answer: 'B (square)', options: ['A', 'B (square)'] });
});

test('Refresh rebuilds the Preview from the edited quiz (an added picture shows)', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  const setQuiz = jest.fn();
  const edited = { ...generated(), _editMode: false, _previewHTML: '<html>old</html>' };
  edited.tasks[0].sharedImageUrl = 'https://x.test/added.png';
  await render(<InteractiveQuizPreviewModal quiz={edited} setQuiz={setQuiz} onClose={jest.fn()} />);
  await user.press(screen.getByTestId('quiz-preview-refresh'));
  const sent = JSON.parse((global as any).fetch.mock.calls.at(-1)[1].body).quiz;
  expect(sent.tasks[0].sharedImageUrl).toBe('https://x.test/added.png');
  expect(sent._previewHTML).toBeUndefined();
  expect(setQuiz).toHaveBeenLastCalledWith(expect.objectContaining({ _previewHTML: '<html>edited</html>', _editMode: false }));
});

test('Refresh is only on the Preview tab', async () => {
  await render(<Harness />);
  expect(screen.queryByTestId('quiz-preview-refresh')).toBeNull();
});
