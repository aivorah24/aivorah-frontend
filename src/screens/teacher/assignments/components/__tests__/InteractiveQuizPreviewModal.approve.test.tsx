import React from 'react';
import { Platform } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { InteractiveQuizPreviewModal } from '../InteractiveQuizPreviewModal';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

const PARTIAL_QUIZ = {
  tasks: [],
  conversionReport: { overallStatus: 'PARTIAL', items: [{ status: 'MISSING' }, { status: 'PRESERVED' }] },
};

describe('Approve & Save on web', () => {
  const originalOS = Platform.OS;
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true });
    (global as any).window = { ...(global as any).window, confirm: jest.fn() };
  });
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => originalOS, configurable: true });
  });

  test('a quiz that needs review asks with the browser confirm and saves on OK', async () => {
    (window.confirm as jest.Mock).mockReturnValue(true);
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<InteractiveQuizPreviewModal quiz={PARTIAL_QUIZ} setQuiz={jest.fn()} onClose={onClose} />);

    await user.press(screen.getByText('Approve & Save'));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('1 task could not be fully verified'));
    expect(onClose).toHaveBeenCalled();
  });

  test('cancelling the confirm keeps the preview open', async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<InteractiveQuizPreviewModal quiz={PARTIAL_QUIZ} setQuiz={jest.fn()} onClose={onClose} />);

    await user.press(screen.getByText('Approve & Save'));

    expect(onClose).not.toHaveBeenCalled();
  });

  test('a fully verified quiz saves straight away', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<InteractiveQuizPreviewModal quiz={{ tasks: [], conversionReport: { overallStatus: 'COMPLETE', items: [] } }} setQuiz={jest.fn()} onClose={onClose} />);

    await user.press(screen.getByText('Approve & Save'));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('how the worksheet was read', () => {
  test('a text-only conversion (no vision AI) says so in the review banner', async () => {
    await render(<InteractiveQuizPreviewModal quiz={{ ...PARTIAL_QUIZ, visualUnderstandingAvailable: false }} setQuiz={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByTestId('quiz-preview-text-only-note')).toBeTruthy();
  });

  test('a vision conversion shows no such note', async () => {
    await render(<InteractiveQuizPreviewModal quiz={{ ...PARTIAL_QUIZ, visualUnderstandingAvailable: true }} setQuiz={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByTestId('quiz-preview-text-only-note')).toBeNull();
  });
});
