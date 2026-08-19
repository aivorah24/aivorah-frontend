import React from 'react';
import { render, screen } from '@testing-library/react-native';
import UpcomingDeadlines from '../UpcomingDeadlines';
import type { ScheduleEvent } from '../../types';

const colors = {} as any;

function dl(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return { id: '1', title: 'Worksheet 1', date: '2026-04-20', startTime: '', endTime: '', type: 'deadline', note: '', studentId: 's1', createdBy: 'teacher', tag: null, ...overrides };
}

describe('UpcomingDeadlines', () => {
  test('an empty list shows the real empty state message', async () => {
    await render(<UpcomingDeadlines deadlines={[]} styles={{}} colors={colors} />);
    expect(screen.getByText('No upcoming deadlines 🎉')).toBeTruthy();
  });

  test('renders real deadline titles and due dates', async () => {
    await render(<UpcomingDeadlines deadlines={[dl({ title: 'Fractions Worksheet', date: '2026-04-22' })]} styles={{}} colors={colors} />);
    expect(screen.getByText('Fractions Worksheet')).toBeTruthy();
    expect(screen.getByText('Due 2026-04-22')).toBeTruthy();
  });

  test('caps the visible list at 6 items even when more are given', async () => {
    const many = Array.from({ length: 10 }, (_, i) => dl({ id: `${i}`, title: `Deadline ${i}` }));
    await render(<UpcomingDeadlines deadlines={many} styles={{}} colors={colors} />);
    expect(screen.getByTestId('schedule-deadline-5')).toBeTruthy();
    expect(screen.queryByTestId('schedule-deadline-6')).toBeNull();
  });
});
