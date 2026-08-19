import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { usePracticeRedirect } from '../usePracticeRedirect';
import type { Mode } from '../../types';

function Harness({ mode, topic }: { mode: Mode; topic: any }) {
  const [m, setM] = React.useState<Mode>(mode);
  const navigate = React.useRef(jest.fn());
  (globalThis as any).__navigate = navigate.current;
  usePracticeRedirect(m, setM, topic, { navigate: navigate.current }, {
    grade: 'Grade 6', subject: 'English', curriculum: 'CBSE', topicId: 't1', chapterIndex: 0, topicIndex: 1,
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
      returnParams: { subject: 'English', curriculum: 'CBSE', grade: 'Grade 6', chapterIndex: 0, topicIndex: 1 },
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

  test('a real topic with no readText omits passageText instead of crashing', async () => {
    const topic = { name: 'Math Basics' };
    await render(<Harness mode="practice" topic={topic} />);

    await waitFor(() => expect((globalThis as any).__navigate).toHaveBeenCalled());
    const call = (globalThis as any).__navigate.mock.calls[0][1];
    expect(call.passageText).toBeUndefined();
  });
});
