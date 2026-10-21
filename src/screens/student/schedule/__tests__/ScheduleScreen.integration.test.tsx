// Integration tests for ScheduleScreen — the real screen and all its real
// subcomponents, with the 6 hooks mocked at the module boundary (each has
// its own dedicated test file already).

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import ScheduleScreen from '../ScheduleScreen';
import type { ScheduleEvent } from '../types';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Schedule', name: 'Schedule' }),
}));
jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', accentYellow: '#fa0', textMain: '#fff', textMuted: '#888', textDim: '#666',
    borderColor: '#333', cardDark: '#111', accentRed: '#f00', textHeading: '#fff',
  } }),
}));
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'A Student', email: 'a@a.com', role: 'student' } }),
}));
jest.mock('../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ studentId: 's1', exploreTopic: jest.fn() }),
}));
jest.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: 0, unreadAssignments: 0, unreadChallenges: 0, unreadEvents: 0, unreadJoinRequests: 0,
    latestNotif: null, notificationItems: [], toastVisible: false,
    dismissToast: jest.fn(), clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(),
    clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn(), refresh: jest.fn(),
    triggerPoll: jest.fn(), muteCategory: jest.fn(),
  }),
}));

const mockAddEvent = jest.fn();
const mockRemoveEvent = jest.fn();
let scheduleEventsState: any;

function baseScheduleEventsState(overrides: any = {}) {
  return {
    eventsMap: {}, deadlines: [], eventDates: new Set<string>(), timetableData: null, loading: false,
    fetchEvents: jest.fn(), addEvent: mockAddEvent, removeEvent: mockRemoveEvent,
    ...overrides,
  };
}

jest.mock('../hooks/useScheduleEvents', () => ({
  useScheduleEvents: (...args: any[]) => (global as any).__mockUseScheduleEvents(...args),
}));
jest.mock('../hooks/useBrowserNotifications', () => ({ useBrowserNotifications: () => {} }));
jest.mock('../../../../services/authHeader', () => ({ authHeader: jest.fn(async () => ({ Authorization: 'Bearer test-token' })) }));

const WEEK = [
  { iso: '2026-04-13', day: 'MON', date: 13 }, { iso: '2026-04-14', day: 'TUE', date: 14 },
  { iso: '2026-04-15', day: 'WED', date: 15 }, { iso: '2026-04-16', day: 'THU', date: 16 },
  { iso: '2026-04-17', day: 'FRI', date: 17 }, { iso: '2026-04-18', day: 'SAT', date: 18 },
  { iso: '2026-04-19', day: 'SUN', date: 19 },
];

// useWeekNavigation is real by default, which builds `week` around the actual
// current date at test-run time — mocked here so event fixtures pinned to
// 2026-04-13 actually fall inside the visible week, regardless of when tests run.
jest.mock('../hooks/useWeekNavigation', () => ({
  useWeekNavigation: () => ({
    today: new Date('2026-04-13T12:00:00'), todayISO: '2026-04-13', weekBase: new Date('2026-04-13T12:00:00'),
    week: WEEK, calYear: 2026, calMonth: 4, calWeeks: require('../utils/dateHelpers').buildMonthCalendar(2026, 4),
    colWidth: 140, gridHeight: 1344,
    hScrollRef: { current: null }, vScrollRef: { current: null }, didInitialScrollRef: { current: true },
    prevWeek: jest.fn(), nextWeek: jest.fn(), goToday: jest.fn(),
    prevMonth: jest.fn(), nextMonth: jest.fn(), selectDate: jest.fn(),
    scrollToToday: jest.fn(), scrollToCurrentTime: jest.fn(),
  }),
}));

function ev(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return { id: '1', title: 'maths class', date: '2026-04-13', startTime: '10:00', endTime: '11:00', type: 'lesson', note: '', studentId: 's1', createdBy: 'teacher', tag: null, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  scheduleEventsState = baseScheduleEventsState();
  (global as any).__mockUseScheduleEvents = () => scheduleEventsState;
  // ScreenLayout (real, not mocked) gates ALL children behind its own
  // screen-time-status fetch for student users — must resolve for anything
  // in this screen to render at all. Unmocked, this fetch is a real network
  // call whose timing is nondeterministic, causing exactly the kind of
  // intermittent "element not found yet" flakiness seen here.
  global.fetch = jest.fn().mockResolvedValue({ json: async () => ({}) });
});

function navProp() {
  return { navigate: jest.fn(), openDrawer: jest.fn() };
}

describe('ScheduleScreen — rendering', () => {
  test('renders the real filter bar, week nav, calendar grid, and sidebar together', async () => {
    await render(<ScheduleScreen navigation={navProp()} />);
    expect(await screen.findByTestId('schedule-filter-all')).toBeTruthy();
    expect(screen.getByTestId('schedule-week-label')).toBeTruthy();
    expect(screen.getByTestId('schedule-add-event-button')).toBeTruthy();
    expect(screen.getByTestId('schedule-upcoming-deadlines')).toBeTruthy();
  });

  test('a real event from useScheduleEvents renders through the real CalendarGrid', async () => {
    scheduleEventsState = baseScheduleEventsState({ eventsMap: { '2026-04-13': [ev({ title: 'Maths Class' })] } });
    await render(<ScheduleScreen navigation={navProp()} />);
    expect(await screen.findByText('Maths Class')).toBeTruthy();
  });
});

describe('ScheduleScreen — opening the Add Event modal', () => {
  test('pressing "Add Event" opens the real modal', async () => {
    const user = userEvent.setup();
    await render(<ScheduleScreen navigation={navProp()} />);
    await user.press(await screen.findByTestId('schedule-add-event-button'));
    expect(await screen.findByTestId('schedule-modal-title-input')).toBeTruthy();
  });

  test('confirming a real new event calls the real addEvent from useScheduleEvents', async () => {
    mockAddEvent.mockResolvedValueOnce({ id: 'new-ev' });
    const user = userEvent.setup();
    await render(<ScheduleScreen navigation={navProp()} />);
    await user.press(await screen.findByTestId('schedule-add-event-button'));
    await user.type(await screen.findByTestId('schedule-modal-title-input'), 'Homework');

    await user.press(screen.getByTestId('schedule-modal-confirm-button'));

    expect(mockAddEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'Homework' }));
  });
});

describe('ScheduleScreen — event detail + navigation', () => {
  test('pressing a real event opens its detail modal with the real title', async () => {
    scheduleEventsState = baseScheduleEventsState({ eventsMap: { '2026-04-13': [ev({ title: 'Maths Class' })] } });
    const user = userEvent.setup();
    await render(<ScheduleScreen navigation={navProp()} />);

    await user.press(await screen.findByText('Maths Class'));

    // Detail modal renders the title-cased title too — now shown twice (grid + modal).
    expect(screen.getAllByText('Maths Class').length).toBeGreaterThanOrEqual(2);
  });

  test('opening a deadline\'s detail and pressing "Open Assignment Worksheet" navigates and closes the modal', async () => {
    scheduleEventsState = baseScheduleEventsState({
      eventsMap: { '2026-04-13': [ev({ type: 'deadline', title: 'Worksheet 1', startTime: '23:59', assignmentId: 'a1' })] },
    });
    const nav = navProp();
    const user = userEvent.setup();
    await render(<ScheduleScreen navigation={nav} />);

    await user.press(await screen.findByText('Worksheet 1'));
    await user.press(await screen.findByText('Open Assignment Worksheet'));

    expect(nav.navigate).toHaveBeenCalledWith('Assignments', { assignmentId: 'a1' });
  });
});

describe('ScheduleScreen — deep-linking from an event notification', () => {
  test('a real highlightId (outside the currently-visible week) fetches that event directly and opens its detail modal', async () => {
    // Event notification items are 'evt_' + id (see Header.tsx) — this
    // screen receives the id already stripped, via route.params.
    global.fetch = jest.fn((url: string) => {
      if (String(url).includes('/schedule/event/ev-far-away')) {
        return Promise.resolve({
          ok: true,
          json: async () => ev({ id: 'ev-far-away', title: 'Science Fair', date: '2026-05-01' }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as any;
    const nav = { ...navProp(), setParams: jest.fn() };

    await render(<ScheduleScreen navigation={nav} route={{ params: { highlightId: 'ev-far-away' } }} />);

    expect(await screen.findByText('Science Fair')).toBeTruthy();
    expect(nav.setParams).toHaveBeenCalledWith({ highlightId: undefined });
  });

  test('a real highlightId that no longer exists (404) does not crash the screen', async () => {
    global.fetch = jest.fn((url: string) => {
      if (String(url).includes('/schedule/event/')) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as any;

    await render(<ScheduleScreen navigation={navProp()} route={{ params: { highlightId: 'deleted-event' } }} />);

    expect(await screen.findByTestId('schedule-week-label')).toBeTruthy();
  });
});

describe('ScheduleScreen — removing an event', () => {
  test('deleting a real event calls the real removeEvent from useScheduleEvents', async () => {
    scheduleEventsState = baseScheduleEventsState({ eventsMap: { '2026-04-13': [ev({ id: 'ev-77' })] } });
    const user = userEvent.setup();
    await render(<ScheduleScreen navigation={navProp()} />);

    await user.press(await screen.findByTestId('schedule-delete-event-ev-77'));

    expect(mockRemoveEvent).toHaveBeenCalledWith('ev-77', '2026-04-13');
  });
});
