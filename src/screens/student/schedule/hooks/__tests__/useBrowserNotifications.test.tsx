import React from 'react';
import { render } from '@testing-library/react-native';
import { useBrowserNotifications } from '../useBrowserNotifications';
import { dateISO } from '../../utils/dateHelpers';
import type { ScheduleEvent } from '../../types';

function ev(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return { id: '1', title: 'Maths Class', date: '2026-04-15', startTime: '10:00', endTime: '11:00', type: 'lesson', note: '', studentId: 's1', createdBy: 'teacher', tag: null, ...overrides };
}

function Harness({ eventsMap }: { eventsMap: Record<string, ScheduleEvent[]> }) {
  useBrowserNotifications(eventsMap);
  return null;
}

let mockNotificationCtor: jest.Mock;
let requestPermissionMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  requestPermissionMock = jest.fn();
  mockNotificationCtor = jest.fn().mockImplementation(() => ({ close: jest.fn() }));
  (mockNotificationCtor as any).permission = 'granted';
  (mockNotificationCtor as any).requestPermission = requestPermissionMock;
  (global as any).Notification = mockNotificationCtor;
});

afterEach(() => {
  jest.useRealTimers();
  delete (global as any).Notification;
});

describe('useBrowserNotifications', () => {
  test('requests permission on mount when permission is still "default"', async () => {
    (mockNotificationCtor as any).permission = 'default';
    await render(<Harness eventsMap={{}} />);
    expect(requestPermissionMock).toHaveBeenCalled();
  });

  test('never requests permission again once already granted', async () => {
    (mockNotificationCtor as any).permission = 'granted';
    await render(<Harness eventsMap={{}} />);
    expect(requestPermissionMock).not.toHaveBeenCalled();
  });

  test('fires a real browser notification for a today event whose startTime matches the current clock', async () => {
    const now = new Date();
    const todayIso = dateISO(now);
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    await render(<Harness eventsMap={{ [todayIso]: [ev({ startTime: currentTime, title: 'Live Maths' })] }} />);

    expect(mockNotificationCtor).toHaveBeenCalledWith('Aivorah — Live Maths', expect.objectContaining({ tag: expect.stringContaining('1_') }));
  });

  test('does not notify for an event whose startTime does not match the current clock', async () => {
    const now = new Date();
    const todayIso = dateISO(now);

    await render(<Harness eventsMap={{ [todayIso]: [ev({ startTime: '23:58' })] }} />);

    expect(mockNotificationCtor).not.toHaveBeenCalled();
  });

  test('the same event is never notified twice, even across the 60s recheck interval', async () => {
    const now = new Date();
    const todayIso = dateISO(now);
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    await render(<Harness eventsMap={{ [todayIso]: [ev({ startTime: currentTime })] }} />);
    expect(mockNotificationCtor).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60000);

    expect(mockNotificationCtor).toHaveBeenCalledTimes(1);
  });

  test('no Notification support at all -> no crash, nothing fired', async () => {
    delete (global as any).Notification;
    await render(<Harness eventsMap={{ '2026-04-15': [ev()] }} />);
    // No assertion needed beyond "did not throw" — render() would reject if it did.
  });
});
