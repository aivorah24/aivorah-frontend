import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import ActivityTable from '../../components/ActivityTable';
import type { RosterStudent } from '../../types';

const colors: any = {
  textMain: '#111', textMuted: '#666', textDim: '#999', borderColor: '#ddd', cardDark: '#fafafa',
};

function makeStudents(n: number): RosterStudent[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`, name: `Student ${i + 1}`, grade: 'Grade 4', curriculum: 'CBSE', section: null, class: null, photoUrl: null,
    scopedSubjects: ['Mathematics'], studyTime: 10, learningPathTime: 5, learningPathTimeToday: 2, assignmentTime: 3, challengeTime: 2,
    progressPct: 40, totalTopics: 10, completedTopics: ['Fractions', 'Decimals', 'Ratios', 'Algebra'],
    quizAttempts: 2, quizBestScore: 70, lastActive: '2026-08-20', needsAttention: false,
  }));
}

const noop = () => {};

describe('ActivityTable', () => {
  test('shows the real "X / Y topics" fraction using completedTopics.length as the numerator', async () => {
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={makeStudents(1)} loading={false} mode="overall" onModeChange={noop} />);
    expect(screen.getByText('Grade 4 · 4 / 10 topics')).toBeTruthy();
  });

  test('12 students -> only 10 shown on page 1, with a real "Showing 10 of 12" footer', async () => {
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={makeStudents(12)} loading={false} mode="overall" onModeChange={noop} />);
    expect(screen.getByTestId('activity-row-s1')).toBeTruthy();
    expect(screen.getByTestId('activity-row-s10')).toBeTruthy();
    expect(screen.queryByTestId('activity-row-s11')).toBeNull();
    expect(screen.getByText('Showing 10 of 12 students')).toBeTruthy();
  });

  test('pressing next reveals the real remaining students on page 2', async () => {
    const user = userEvent.setup();
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={makeStudents(12)} loading={false} mode="overall" onModeChange={noop} />);

    await user.press(screen.getByTestId('activity-page-next'));

    expect(screen.queryByTestId('activity-row-s1')).toBeNull();
    expect(screen.getByTestId('activity-row-s11')).toBeTruthy();
    expect(screen.getByTestId('activity-row-s12')).toBeTruthy();
  });

  test('11 students or fewer -> no pagination controls at all (nothing to page through)', async () => {
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={makeStudents(5)} loading={false} mode="overall" onModeChange={noop} />);
    expect(screen.queryByTestId('activity-page-next')).toBeNull();
  });

  test('a student with totalTopics=0 shows the honest "no topic data" message, not a fake 0/0 fraction', async () => {
    const students = makeStudents(1);
    students[0].totalTopics = 0;
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={students} loading={false} mode="overall" onModeChange={noop} />);
    expect(screen.getByText('No topic data for Mathematics')).toBeTruthy();
    expect(screen.queryByText(/\/ 0 topics/)).toBeNull();
  });

  test('a student with zero quiz attempts shows "No quiz attempts", not a fake 0% or dash', async () => {
    const students = makeStudents(1);
    students[0].quizAttempts = 0;
    students[0].quizBestScore = null;
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={students} loading={false} mode="overall" onModeChange={noop} />);
    expect(screen.getByText('No quiz attempts')).toBeTruthy();
  });

  test('Overall mode shows cumulative learningPathTime; Today mode shows the real learningPathTimeToday', async () => {
    const students = makeStudents(1);
    students[0].learningPathTime = 45;
    students[0].learningPathTimeToday = 8;
    const { rerender } = await render(<ActivityTable colors={colors} gold="#C9A24E" students={students} loading={false} mode="overall" onModeChange={noop} />);
    expect(screen.getByText('45m')).toBeTruthy();

    await rerender(<ActivityTable colors={colors} gold="#C9A24E" students={students} loading={false} mode="today" onModeChange={noop} />);
    expect(screen.getByText('8m')).toBeTruthy();
  });

  test('Today mode shows an honest dash for Assignments/Challenges — no real per-day tracking exists for them', async () => {
    const students = makeStudents(1);
    students[0].assignmentTime = 30;
    students[0].challengeTime = 15;
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={students} loading={false} mode="today" onModeChange={noop} />);
    expect(screen.queryByText('30m')).toBeNull();
    expect(screen.queryByText('15m')).toBeNull();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  test('pressing the Today/Overall toggle calls onModeChange with the real selected mode', async () => {
    const user = userEvent.setup();
    const onModeChange = jest.fn();
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={makeStudents(1)} loading={false} mode="overall" onModeChange={onModeChange} />);

    await user.press(screen.getByTestId('activity-mode-today'));

    expect(onModeChange).toHaveBeenCalledWith('today');
  });
});
