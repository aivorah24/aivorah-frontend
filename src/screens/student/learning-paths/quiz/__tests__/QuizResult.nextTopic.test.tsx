import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import QuizResult from '../components/QuizResult';
import { findNextTopic } from '../hooks/useNextTopic';
import { makeStyles } from '../styles';

jest.mock('../../../../../components/common/ScreenLayout', () => ({ children }: any) => children);
jest.mock('../../../../../components/common/Header', () => () => null);
jest.mock('../../../../../components/common/Confetti', () => () => null);
jest.mock('../../../../../components/common/TrophyIcon', () => () => null);
jest.mock('../../../../../hooks/useResponsive', () => ({ useResponsive: () => ({ isMobile: false }) }));

const colors: any = {
  accentYellow: '#BAA467', accentGreen: '#4A9E70', textMain: '#000', textMuted: '#555', textDim: '#999',
  cardDark: '#fff', bgDark: '#eee', borderColor: '#ddd',
};
const CTX = { subject: 'English', curriculum: 'CBSE', grade: 'Grade 8' };
const SYL = {
  subject: 'English', isDbBacked: true,
  units: [
    { title: 'Wit and Wisdom', topics: [{ id: 't1', name: 'The Wit that Won Hearts' }, { id: 't2', name: 'A Concrete Example' }] },
    { title: 'Not written yet', pending: true, topics: [] },
    { title: 'Values', topics: [{ id: 't3', name: 'Soon', comingSoon: true }, { id: 't4', name: 'A Tale of Valour' }] },
  ],
};

describe('findNextTopic', () => {
  test('next topic in the same chapter', () => {
    expect(findNextTopic(SYL as any, 'The Wit that Won Hearts', CTX)).toMatchObject({
      name: 'A Concrete Example', chapterTitle: 'Wit and Wisdom', params: { chapterIndex: 0, topicIndex: 1, topicId: 't2' },
    });
  });

  test('last topic of a chapter moves to the next chapter, skipping pending chapters and coming-soon topics', () => {
    expect(findNextTopic(SYL as any, 'A Concrete Example', CTX)).toMatchObject({
      name: 'A Tale of Valour', chapterTitle: 'Values', params: { chapterIndex: 2, topicIndex: 1 },
    });
  });

  test('last topic of the subject, or an unknown topic, has no next', () => {
    expect(findNextTopic(SYL as any, 'A Tale of Valour', CTX)).toBeNull();
    expect(findNextTopic(SYL as any, 'Nope', CTX)).toBeNull();
  });
});

function renderResult(score: number, extra: any = {}) {
  const results = Array.from({ length: 5 }, (_, i) => ({
    question: `Q${i + 1}`, studentAnswer: 'a', correctAnswer: i < score ? 'a' : 'b', isCorrect: i < score,
  }));
  return render(
    <QuizResult
      topic="The Wit that Won Hearts" score={score} questions={results} perQuestionResults={results}
      resultExplanations={{}} explanationsRef={{ current: {} }} attemptNumber={1} quizStartTime={Date.now()}
      colors={colors} isDark={false} styles={makeStyles(colors, false)}
      onRetry={jest.fn()} onBack={jest.fn()} onMenuPress={jest.fn()}
      {...extra}
    />,
  );
}

describe('QuizResult — next topic gate', () => {
  const next = findNextTopic(SYL as any, 'The Wit that Won Hearts', CTX)!;

  test('60% or more shows the Next topic button, which opens it', async () => {
    const onNextTopic = jest.fn();
    await renderResult(3, { nextTopic: next, onNextTopic });
    expect(screen.getByText('A Concrete Example')).toBeTruthy();
    expect(screen.queryByTestId('quiz-next-locked')).toBeNull();
    fireEvent.press(screen.getByTestId('quiz-next-topic'));
    expect(onNextTopic).toHaveBeenCalledWith(next);
  });

  test('below 60% hides it and asks to retake', async () => {
    await renderResult(2, { nextTopic: next, onNextTopic: jest.fn() });
    expect(screen.queryByTestId('quiz-next-topic')).toBeNull();
    expect(screen.getByTestId('quiz-next-locked')).toBeTruthy();
  });

  test('passing the last topic of a subject says so instead', async () => {
    await renderResult(5, { nextTopic: null, nextTopicLoading: false, onNextTopic: jest.fn() });
    expect(screen.getByTestId('quiz-subject-finished')).toBeTruthy();
  });

  test('question cards sit in two columns on wide screens', async () => {
    await renderResult(3);
    screen.getAllByTestId('quiz-review-card').forEach(c => {
      expect(c.props.style).toEqual(expect.arrayContaining([{ width: '49.2%' }]));
    });
  });
});
