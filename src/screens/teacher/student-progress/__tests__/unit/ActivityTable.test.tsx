import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import ActivityTable from '../../components/ActivityTable';
import type { RosterStudent } from '../../types';

const colors: any = {
  textMain: '#111', textMuted: '#666', textDim: '#999', borderColor: '#ddd', cardDark: '#fafafa',
};

function makeStudents(n: number): RosterStudent[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`, name: `Student ${i + 1}`, grade: 'Grade 4', curriculum: 'CBSE', section: null, photoUrl: null,
    scopedSubjects: ['Mathematics'], studyTime: 10, learningPathTime: 5, assignmentTime: 3, challengeTime: 2,
    progressPct: 40, totalTopics: 10, completedTopics: ['Fractions', 'Decimals', 'Ratios', 'Algebra'],
    quizAttempts: 2, quizBestScore: 70, lastActive: '2026-08-20', needsAttention: false,
  }));
}

describe('ActivityTable', () => {
  test('shows the real "X / Y topics" fraction using completedTopics.length as the numerator', async () => {
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={makeStudents(1)} loading={false} />);
    expect(screen.getByText('Grade 4 · 4 / 10 topics')).toBeTruthy();
  });

  test('12 students -> only 10 shown on page 1, with a real "Showing 10 of 12" footer', async () => {
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={makeStudents(12)} loading={false} />);
    expect(screen.getByTestId('activity-row-s1')).toBeTruthy();
    expect(screen.getByTestId('activity-row-s10')).toBeTruthy();
    expect(screen.queryByTestId('activity-row-s11')).toBeNull();
    expect(screen.getByText('Showing 10 of 12 students')).toBeTruthy();
  });

  test('pressing next reveals the real remaining students on page 2', async () => {
    const user = userEvent.setup();
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={makeStudents(12)} loading={false} />);

    await user.press(screen.getByTestId('activity-page-next'));

    expect(screen.queryByTestId('activity-row-s1')).toBeNull();
    expect(screen.getByTestId('activity-row-s11')).toBeTruthy();
    expect(screen.getByTestId('activity-row-s12')).toBeTruthy();
  });

  test('11 students or fewer -> no pagination controls at all (nothing to page through)', async () => {
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={makeStudents(5)} loading={false} />);
    expect(screen.queryByTestId('activity-page-next')).toBeNull();
  });

  test('a student with totalTopics=0 shows the honest "no topic data" message, not a fake 0/0 fraction', async () => {
    const students = makeStudents(1);
    students[0].totalTopics = 0;
    await render(<ActivityTable colors={colors} gold="#C9A24E" students={students} loading={false} />);
    expect(screen.getByText('No topic data for Mathematics')).toBeTruthy();
    expect(screen.queryByText(/\/ 0 topics/)).toBeNull();
  });
});
