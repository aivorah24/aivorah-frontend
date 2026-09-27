import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import InlineQuiz from '../InlineQuiz';

const colors: any = { cardDark: '#fff', textMain: '#111', textMuted: '#666', borderColor: '#ccc', accentYellow: '#9A7B2E', bgDark: '#F5F3EE' };
const questions = [
  { question: 'How long was Nehru in the fort?', options: ['Two months', 'Over twenty months', 'Five years', 'One week'], correctIndex: 1, explanation: 'He says more than twenty months.', page: 1 },
  { question: 'What did he start doing?', options: ['Gardening', 'Painting', 'Singing', 'Running'], correctIndex: 0 },
];

describe('InlineQuiz', () => {
  test('marks the answer, explains it with the book page, and moves on', async () => {
    const user = userEvent.setup();
    await render(<InlineQuiz questions={questions} colors={colors} />);
    expect(screen.getByText('QUESTION 1 OF 2')).toBeTruthy();
    await user.press(screen.getByTestId('quiz-option-0'));
    expect(screen.getByText('Not quite. The answer is B.')).toBeTruthy();
    expect(screen.getByText('He says more than twenty months. (Book page 1)')).toBeTruthy();
    await user.press(screen.getByTestId('quiz-next'));
    expect(screen.getByText('QUESTION 2 OF 2')).toBeTruthy();
  });

  test('shows the score at the end and can start again', async () => {
    const user = userEvent.setup();
    await render(<InlineQuiz questions={questions} colors={colors} />);
    await user.press(screen.getByTestId('quiz-option-1'));
    await user.press(screen.getByTestId('quiz-next'));
    await user.press(screen.getByTestId('quiz-option-0'));
    await user.press(screen.getByTestId('quiz-next'));
    expect(screen.getByText('You scored 2 of 2')).toBeTruthy();
    await user.press(screen.getByTestId('quiz-retry'));
    expect(screen.getByText('QUESTION 1 OF 2')).toBeTruthy();
  });
});
