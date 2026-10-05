import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WeeklySnapshotStats from '../../components/WeeklySnapshotStats';

const colors: any = { accentYellow: '#c90', accentRed: '#e33', textDim: '#999', textMain: '#111', textMuted: '#666' };
const s: any = new Proxy({}, { get: () => ({}) });
const child: any = { id: 'c1', name: 'Asha', grade: 'Grade 5', xpPoints: 0, completedTopics: [], currentStreak: 0, studyTimeMinutes: 0 };

function renderCard(summary: any) {
  return render(
    <WeeklySnapshotStats child={child} weeklyStudyH="0h" tasksDone={0} tasksTotal={0} isB2B
      attendanceSummary={{ summary, history: [] }} onViewAttendanceHistory={jest.fn()} colors={colors} s={s} />,
  );
}

describe('WeeklySnapshotStats attendance card', () => {
  test('shows the overall rate with the counts', async () => {
    await renderCard({ present: 1, absent: 1, late: 0, total: 2, ratePct: 50 });
    expect(screen.getByText('Overall attendance: 50%')).toBeTruthy();
    expect(screen.getByText('Present')).toBeTruthy();
    expect(screen.getByText('Absent')).toBeTruthy();
  });

  test('with nothing marked it says so instead of a percentage', async () => {
    await renderCard({ present: 0, absent: 0, late: 0, total: 0, ratePct: null });
    expect(screen.getByText('No attendance recorded yet')).toBeTruthy();
    expect(screen.queryByText(/Overall attendance/)).toBeNull();
    expect(screen.queryByText(/100%|null%/)).toBeNull();
  });
});
