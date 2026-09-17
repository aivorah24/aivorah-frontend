import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import EventDetailModal from '../EventDetailModal';
import type { SelectedEventDetail } from '../../types';

const colors = { accentYellow: '#fa0', textDim: '#666', bgDark: '#000', borderColor: '#333', textMain: '#fff' } as any;
const styles = { modalOverlay: {}, modal: {}, modalTitle: {}, modalBtns: {}, modalConfirm: {}, modalConfirmText: {} };

function detail(overrides: Partial<SelectedEventDetail> = {}): SelectedEventDetail {
  return {
    id: '1', title: 'maths class', date: '2026-04-15', startTime: '10:00', endTime: '11:00',
    type: 'lesson', note: '', studentId: 's1', createdBy: 'teacher', tag: null,
    accent: '#7FC29B', fill: '#E4F3E9', textCol: '#2E7D5B',
    ...overrides,
  };
}

describe('EventDetailModal', () => {
  test('not shown when no event is selected', async () => {
    await render(<EventDetailModal selectedEvent={null} onClose={() => {}} onNavigate={() => {}} styles={styles} colors={colors} />);
    expect(screen.queryByText('Close')).toBeNull();
  });

  test('title-cases the event title for display', async () => {
    await render(<EventDetailModal selectedEvent={detail({ title: 'maths class' })} onClose={() => {}} onNavigate={() => {}} styles={styles} colors={colors} />);
    expect(screen.getByText('Maths Class')).toBeTruthy();
  });

  test('a plain timed event shows its start–end time range', async () => {
    await render(<EventDetailModal selectedEvent={detail({ startTime: '10:00', endTime: '11:00' })} onClose={() => {}} onNavigate={() => {}} styles={styles} colors={colors} />);
    expect(screen.getByText('10:00 – 11:00')).toBeTruthy();
  });

  test('a deadline with an assignmentId shows the real "Closes" date instead of a plain time range', async () => {
    await render(<EventDetailModal selectedEvent={detail({ type: 'deadline', assignmentId: 'a1', date: '2026-04-20', startTime: '23:59' })} onClose={() => {}} onNavigate={() => {}} styles={styles} colors={colors} />);
    expect(screen.getByText(/Closes/)).toBeTruthy();
  });

  test('a real note is shown', async () => {
    await render(<EventDetailModal selectedEvent={detail({ note: 'Bring calculator' })} onClose={() => {}} onNavigate={() => {}} styles={styles} colors={colors} />);
    expect(screen.getByText('Bring calculator')).toBeTruthy();
  });

  test('no note -> shows the real placeholder text', async () => {
    await render(<EventDetailModal selectedEvent={detail({ note: '' })} onClose={() => {}} onNavigate={() => {}} styles={styles} colors={colors} />);
    expect(screen.getByText('No note added for this event.')).toBeTruthy();
  });

  test('an assignment deadline shows an "Open Assignment Worksheet" button that navigates correctly', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();
    await render(<EventDetailModal selectedEvent={detail({ type: 'deadline', assignmentId: 'a1' })} onClose={() => {}} onNavigate={onNavigate} styles={styles} colors={colors} />);

    await user.press(screen.getByText('Open Assignment Worksheet'));

    expect(onNavigate).toHaveBeenCalledWith('Assignments', { assignmentId: 'a1' });
  });

  test('a challenge deadline shows "Open Challenge" and navigates to Challenges', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();
    await render(<EventDetailModal selectedEvent={detail({ type: 'challenge', assignmentId: 'c1' })} onClose={() => {}} onNavigate={onNavigate} styles={styles} colors={colors} />);

    await user.press(screen.getByText('Open Challenge'));

    expect(onNavigate).toHaveBeenCalledWith('Challenges', { challengeId: 'c1' });
  });

  test('a timetable class (isTimetableClass) never shows the open-worksheet button, even with an assignmentId', async () => {
    await render(<EventDetailModal selectedEvent={detail({ assignmentId: 'a1', isTimetableClass: true })} onClose={() => {}} onNavigate={() => {}} styles={styles} colors={colors} />);
    expect(screen.queryByText(/Open/)).toBeNull();
  });

  test('pressing Close calls onClose', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<EventDetailModal selectedEvent={detail()} onClose={onClose} onNavigate={() => {}} styles={styles} colors={colors} />);

    await user.press(screen.getByText('Close'));

    expect(onClose).toHaveBeenCalled();
  });
});
