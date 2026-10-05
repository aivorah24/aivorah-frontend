import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { usePracticeRedirect } from '../usePracticeRedirect';
import type { Mode } from '../../types';

function Harness({ mode, topic }: { mode: Mode; topic: any }) {
  const [m, setM] = React.useState<Mode>(mode);
  const navigate = React.useMemo(() => jest.fn(), []);
  React.useEffect(() => { (globalThis as any).__navigate = navigate; }, [navigate]);
  usePracticeRedirect(m, setM, topic, { navigate }, {
    grade: 'Grade 6', subject: 'English', curriculum: 'CBSE', topicId: 't1', chapterIndex: 0, topicIndex: 1,
    byNameTopic: undefined, chapterTitle: 'Fables and Folk Tales',
  });
  return <Text testID="mode">{m}</Text>;
}

beforeEach(() => { (globalThis as any).__navigate = undefined; });

describe('usePracticeRedirect', () => {
  test('a real "practice" mode with a real topic navigates to Quiz and flips mode back to "read"', async () => {
    const topic = { name: 'Fables', readText: { intro: 'Once upon a time', body: ['there was a fox.'] } };
    await render(<Harness mode="practice" topic={topic} />);

    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('read'));
    expect((globalThis as any).__navigate).toHaveBeenCalledWith('Quiz', expect.objectContaining({
      topic: 'Fables', grade: 'Grade 6', subject: 'English', curriculum: 'CBSE', topicId: 't1',
      passageText: 'Once upon a time there was a fox.',
      returnTo: 'LessonScreen',
      returnParams: {
        subject: 'English', curriculum: 'CBSE', grade: 'Grade 6', chapterIndex: 0, topicIndex: 1,
        topicId: 't1', byNameTopic: undefined, chapterTitle: 'Fables and Folk Tales', topicName: undefined,
      },
    }));
  });

  // Regression: a Qdrant/byName-resolved topic (no topicId) lost its
  // identity entirely on the way back from Quiz — returnParams only carried
  // subject/curriculum/grade/chapterIndex/topicIndex, so LessonScreen fell
  // back to the curated syllabusRegistry (Grade 6 only), found nothing for a
  // real topic like Grade 11 Accountancy, and showed "This lesson isn't
  // available yet" instead of the real lesson. See BUGS_AND_FIXES.md.
  test('a real byName (Qdrant-resolved) topic carries byNameTopic and chapterTitle back through returnParams, so LessonScreen can re-resolve it', async () => {
    function ByNameHarness() {
      const [m, setM] = React.useState<Mode>('practice');
      const navigate = React.useMemo(() => jest.fn(), []);
      React.useEffect(() => { (globalThis as any).__navigate = navigate; }, [navigate]);
      const topic = { name: 'Transaction in Accounting', readText: { intro: 'A transaction...', body: [] } };
      usePracticeRedirect(m, setM, topic, { navigate }, {
        grade: 'Grade 11', subject: 'Accountancy', curriculum: 'CBSE', topicId: undefined,
        chapterIndex: 0, topicIndex: 6,
        byNameTopic: 'Transaction in Accounting', chapterTitle: 'Learning Objectives',
      });
      return <Text testID="mode">{m}</Text>;
    }
    await render(<ByNameHarness />);

    await waitFor(() => expect((globalThis as any).__navigate).toHaveBeenCalled());
    const call = (globalThis as any).__navigate.mock.calls[0][1];
    expect(call.returnParams).toEqual(expect.objectContaining({
      byNameTopic: 'Transaction in Accounting',
      chapterTitle: 'Learning Objectives',
      topicName: 'Transaction in Accounting',
    }));
  });

  test('flipping mode back to "read" does not re-trigger navigation (no loop)', async () => {
    const topic = { name: 'Fables', readText: { intro: 'Hi', body: [] } };
    await render(<Harness mode="practice" topic={topic} />);
    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('read'));

    expect((globalThis as any).__navigate).toHaveBeenCalledTimes(1);
  });

  test('a real "read" mode never navigates', async () => {
    const topic = { name: 'Fables', readText: { intro: 'Hi', body: [] } };
    await render(<Harness mode="read" topic={topic} />);

    expect((globalThis as any).__navigate).not.toHaveBeenCalled();
  });

  test('"practice" mode with no real topic yet does not navigate (waits for topic to load)', async () => {
    await render(<Harness mode="practice" topic={null} />);

    expect((globalThis as any).__navigate).not.toHaveBeenCalled();
  });

  test('teacherContent.practiceQuiz is forwarded as the Quiz screen\'s practiceQuiz param', async () => {
    function TeacherHarness() {
      const [m, setM] = React.useState<Mode>('practice');
      const navigate = React.useMemo(() => jest.fn(), []);
      React.useEffect(() => { (globalThis as any).__navigate = navigate; }, [navigate]);
      const topic = { name: 'Whole Numbers', readText: { intro: 'x', body: [] } };
      const practiceQuiz = [{ type: 'mcq', question: 'Q1', options: ['A', 'B'], correct: 0 }];
      usePracticeRedirect(m, setM, topic, { navigate }, {
        grade: 'Grade 6', subject: 'Mathematics', curriculum: 'CBSE', topicId: undefined,
        chapterIndex: 0, topicIndex: 0, byNameTopic: undefined, chapterTitle: undefined,
        teacherContent: { practiceQuiz },
      });
      return <Text testID="mode">{m}</Text>;
    }
    await render(<TeacherHarness />);

    await waitFor(() => expect((globalThis as any).__navigate).toHaveBeenCalled());
    const call = (globalThis as any).__navigate.mock.calls[0][1];
    expect(call.practiceQuiz).toEqual([{ type: 'mcq', question: 'Q1', options: ['A', 'B'], correct: 0 }]);
  });

  test('a real topic with no readText omits passageText instead of crashing', async () => {
    const topic = { name: 'Math Basics' };
    await render(<Harness mode="practice" topic={topic} />);

    await waitFor(() => expect((globalThis as any).__navigate).toHaveBeenCalled());
    const call = (globalThis as any).__navigate.mock.calls[0][1];
    expect(call.passageText).toBeUndefined();
  });

  test('while the topic is still locked, Practice does not open the quiz', async () => {
    function LockedHarness() {
      const [m, setM] = React.useState<Mode>('practice');
      const navigate = React.useMemo(() => jest.fn(), []);
      React.useEffect(() => { (globalThis as any).__navigate = navigate; }, [navigate]);
      usePracticeRedirect(m, setM, { name: 'Fables', readText: { intro: 'x', body: [] } }, { navigate }, {
        grade: 'Grade 6', subject: 'English', curriculum: 'CBSE', topicId: 't1', chapterIndex: 0, topicIndex: 1,
        byNameTopic: undefined, chapterTitle: 'Fables',
      }, true, true);
      return <Text testID="mode">{m}</Text>;
    }
    await render(<LockedHarness />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByTestId('mode').props.children).toBe('practice');
    expect((globalThis as any).__navigate).not.toHaveBeenCalled();
  });
});
