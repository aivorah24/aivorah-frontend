import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import TimetableScreen from '../../TimetableScreen';
import TIMETABLE_RESOURCES_SERVER_URL from '../../../../../config/timetableResourcesServerUrl';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Timetable', name: 'Timetable' }),
  useFocusEffect: (cb: any) => {
    require('react').useEffect(() => { cb(); }, []);
  },
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#0B0B0B', cardDark: '#141414', cardHover: '#1A1A1A', borderColor: 'rgba(245,243,238,0.14)',
      textMain: '#F5F3EE', textMuted: '#A9B0AC', textDim: '#6E736B', textHeading: '#F5F3EE',
      accentYellow: '#BAA467', accentRed: '#C98A8A',
    },
  }),
}));

let mockUser: any;
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: async () => 'tok-1' }, authStateReady: async () => {} },
}));

const TEACHER_CLASS = { grade: 'Grade 4', section: 'A', label: 'Grade 4 A', homeroom: false };
const TT_EMPTY_PERIODS = { grade: 'Grade 4', section: 'A', title: '', periodDefs: [], days: [], slots: [], permissions: { canManageTemplate: true, canEditSlot: true } };
const TT_WITH_PERIODS = {
  grade: 'Grade 4', section: 'A', title: '',
  periodDefs: [{ code: 'P1', start: '08:50', end: '09:40', isBreak: false }],
  days: ['MON'], slots: [], permissions: { canManageTemplate: false, canEditSlot: false },
};
const TEACHER = { email: 'teacher@x.com', role: 'teacher', school: 'Test School', name: 'Priya Menon' };
const ADMIN = { email: 'admin@x.com', role: 'school_admin', school: 'Test School', name: 'Admin User' };

function mockFetchImpl({
  classes = [TEACHER_CLASS],
  grades = [] as { name: string; sections: string[] }[],
  curriculum = null as string | null,
  timetable = TT_WITH_PERIODS as any,
  timetableOk = true,
} = {}) {
  return (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    if (url.includes('/timetable/classes')) {
      return Promise.resolve({ ok: true, json: async () => ({ classes, grades, curriculum }) });
    }
    if (url.includes('/timetable?') && method === 'GET') {
      return Promise.resolve({ ok: timetableOk, json: async () => (timetableOk ? timetable : { error: 'Failed to load timetable' }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  };
}

const ADMIN_CLASSES = { classes: [TEACHER_CLASS], grades: [{ name: 'Grade 4', sections: ['A'] }] };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TimetableScreen — integration', () => {
  test('every request goes to the Timetable & Resources service with the sign-in token, no email', async () => {
    mockUser = TEACHER;
    global.fetch = jest.fn(mockFetchImpl()) as any;
    await render(<TimetableScreen navigation={{}} route={{}} />);
    await screen.findByText('Grade 4 A');

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/timetable?'), expect.anything()));
    const calls = (global.fetch as jest.Mock).mock.calls.filter(([u]) => u.includes('/timetable'));
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const [url, init] of calls) {
      expect(url.startsWith(TIMETABLE_RESOURCES_SERVER_URL)).toBe(true);
      expect(url).not.toContain('email=');
      expect(init.headers.Authorization).toBe('Bearer tok-1');
    }
  });

  describe('teacher', () => {
    beforeEach(() => {
      mockUser = TEACHER;
      global.fetch = jest.fn(mockFetchImpl()) as any;
    });

    test('shows their classes as pills and the grid', async () => {
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText('Grade 4 A')).toBeTruthy();
      expect(await screen.findByText('P1')).toBeTruthy();
      expect(screen.queryByText('Grade')).toBeNull();
    });

    test('without template-manage permission there is no Periods button', async () => {
      await render(<TimetableScreen navigation={{}} route={{}} />);
      await screen.findByText('Grade 4 A');
      expect(screen.queryByText('Periods')).toBeNull();
    });
  });

  describe('school admin', () => {
    beforeEach(() => {
      mockUser = ADMIN;
      global.fetch = jest.fn(mockFetchImpl(ADMIN_CLASSES)) as any;
    });

    test('shows the Grade selector from the school\'s grades', async () => {
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText('Grade')).toBeTruthy();
      expect(screen.getByText('Grade 4')).toBeTruthy();
    });

    test('with no periods yet sees the setup prompt', async () => {
      global.fetch = jest.fn(mockFetchImpl({ ...ADMIN_CLASSES, timetable: TT_EMPTY_PERIODS })) as any;
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText('Set up the bell schedule')).toBeTruthy();
    });

    test('Create default periods saves the standard bell schedule', async () => {
      global.fetch = jest.fn(mockFetchImpl({ ...ADMIN_CLASSES, timetable: TT_EMPTY_PERIODS })) as any;
      const user = userEvent.setup();
      await render(<TimetableScreen navigation={{}} route={{}} />);
      await screen.findByText('Set up the bell schedule');

      await user.press(screen.getByText('Create default periods'));

      await waitFor(() => {
        const put = (global.fetch as jest.Mock).mock.calls.find(([u, i]) => u.includes('/timetable/template') && i.method === 'PUT');
        expect(put).toBeTruthy();
        const body = JSON.parse(put[1].body);
        expect(body).toMatchObject({ grade: 'Grade 4', section: 'A' });
        expect(body.periodDefs.length).toBeGreaterThan(5);
        expect(body.email).toBeUndefined();
      });
    });

    test('IB schools show a Programme selector', async () => {
      global.fetch = jest.fn(mockFetchImpl({ ...ADMIN_CLASSES, curriculum: 'IB' })) as any;
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText('Programme')).toBeTruthy();
      expect(screen.getByText('IB PYP')).toBeTruthy();
    });
  });

  test('route params open one class without loading the class list', async () => {
    mockUser = TEACHER;
    global.fetch = jest.fn(mockFetchImpl()) as any;
    await render(<TimetableScreen navigation={{}} route={{ params: { grade: 'Grade 4', section: 'A', label: 'Grade 4 A' } }} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/timetable?grade=Grade+4&section=A'), expect.anything());
    });
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/timetable/classes'), expect.anything());
  });

  test('route params load the timetable a bounded number of times (regression: endless reload)', async () => {
    mockUser = TEACHER;
    global.fetch = jest.fn(mockFetchImpl()) as any;
    await render(<TimetableScreen navigation={{}} route={{ params: { grade: 'Grade 4', section: 'A' } }} />);
    await screen.findByText('P1');
    await new Promise((r) => setTimeout(r, 200));
    const loads = (global.fetch as jest.Mock).mock.calls.filter(([u]) => u.includes('/timetable?')).length;
    expect(loads).toBeLessThanOrEqual(2);
  });

  test('a timetable load failure shows the error state', async () => {
    mockUser = TEACHER;
    global.fetch = jest.fn(mockFetchImpl({ timetableOk: false })) as any;
    await render(<TimetableScreen navigation={{}} route={{}} />);
    expect(await screen.findByText('Failed to load timetable')).toBeTruthy();
  });
});
