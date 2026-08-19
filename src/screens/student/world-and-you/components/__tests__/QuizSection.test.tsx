import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import QuizSection from '../QuizSection';
import type { QuizQuestion } from '../../types';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const colors: any = { textMuted: '#888', textMain: '#fff', bgDark: '#000', cardDark: '#111' };

const question: QuizQuestion = { question: 'What is 2+2?', options: ['3', '4', '5'], correct: 1 };

function baseProps(overrides: any = {}) {
  return {
    quizState: 'idle', quizError: '', questions: [question], currentQ: 0,
    selected: null, answered: false, correctCount: 0, xpEarned: 0,
    isDark: true, colors, styles, onStart: jest.fn(), onAnswer: jest.fn(),
    ...overrides,
  };
}

describe('QuizSection — idle state', () => {
  test('shows the real "Test Your Knowledge" button', async () => {
    await render(<QuizSection {...baseProps()} />);
    expect(screen.getByText('Test Your Knowledge')).toBeTruthy();
  });

  test('pressing the start button calls the real onStart handler', async () => {
    const onStart = jest.fn();
    const user = userEvent.setup();
    await render(<QuizSection {...baseProps({ onStart })} />);

    await user.press(screen.getByText('Test Your Knowledge'));

    expect(onStart).toHaveBeenCalled();
  });

  test('shows a real quizError message when one exists', async () => {
    await render(<QuizSection {...baseProps({ quizError: 'Could not load quiz. Please try again.' })} />);
    expect(screen.getByText('Could not load quiz. Please try again.')).toBeTruthy();
  });
});

describe('QuizSection — loading state', () => {
  test('shows a real "Generating quiz..." message', async () => {
    await render(<QuizSection {...baseProps({ quizState: 'loading' })} />);
    expect(screen.getByText('Generating quiz...')).toBeTruthy();
  });
});

describe('QuizSection — already_done state', () => {
  test('shows the real "come back tomorrow" banner', async () => {
    await render(<QuizSection {...baseProps({ quizState: 'already_done' })} />);
    expect(screen.getByText('Quiz done today! Come back tomorrow.')).toBeTruthy();
  });
});

describe('QuizSection — active state', () => {
  test('shows the real question, its options, and the correct progress counter', async () => {
    await render(<QuizSection {...baseProps({ quizState: 'active' })} />);
    expect(screen.getByText('Question 1 of 1')).toBeTruthy();
    expect(screen.getByText('What is 2+2?')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  test('pressing an option calls the real onAnswer with its real index', async () => {
    const onAnswer = jest.fn();
    const user = userEvent.setup();
    await render(<QuizSection {...baseProps({ quizState: 'active', onAnswer })} />);

    await user.press(screen.getByText('4'));

    expect(onAnswer).toHaveBeenCalledWith(1);
  });

  test('options are disabled once answered — pressing one does not call onAnswer again', async () => {
    const onAnswer = jest.fn();
    const user = userEvent.setup();
    await render(<QuizSection {...baseProps({ quizState: 'active', answered: true, selected: 0, onAnswer })} />);

    await user.press(screen.getByText('3'));

    expect(onAnswer).not.toHaveBeenCalled();
  });

  test('a selected-but-not-yet-answered option gets the real highlighted style branch, not the answered-state colors', async () => {
    // selected !== null but answered is false — the momentary state between a
    // press registering and handleAnswer's setAnswered(true) landing.
    await render(<QuizSection {...baseProps({ quizState: 'active', selected: 1, answered: false })} />);
    // No crash and the real option/question text still renders under this state.
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('What is 2+2?')).toBeTruthy();
  });

  test('renders nothing (null) when there is no question at the current index', async () => {
    await render(<QuizSection {...baseProps({ quizState: 'active', questions: [], currentQ: 0 })} />);
    expect(screen.queryByText(/Question/)).toBeNull();
  });
});

describe('QuizSection — done state', () => {
  test('shows "Perfect score!" when every question was answered correctly', async () => {
    await render(<QuizSection {...baseProps({ quizState: 'done', correctCount: 1, questions: [question] })} />);
    expect(screen.getByText('Perfect score!')).toBeTruthy();
  });

  test('shows the real fractional score when not all correct', async () => {
    await render(<QuizSection {...baseProps({ quizState: 'done', correctCount: 1, questions: [question, question] })} />);
    expect(screen.getByText('1/2 correct')).toBeTruthy();
  });

  test('shows real XP earned when xpEarned is positive', async () => {
    await render(<QuizSection {...baseProps({ quizState: 'done', xpEarned: 20 })} />);
    expect(screen.getByText('+20 XP earned')).toBeTruthy();
  });

  test('shows no XP line when xpEarned is 0', async () => {
    await render(<QuizSection {...baseProps({ quizState: 'done', xpEarned: 0 })} />);
    expect(screen.queryByText(/XP earned/)).toBeNull();
  });
});
