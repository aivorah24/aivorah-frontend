import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import TimetableScreen from '../../TimetableScreen';
import TIMETABLE_RESOURCES_SERVER_URL from '../../../../../config/timetableResourcesServerUrl';
import { clearScreenCache } from '../../../../../utils/screenCache';

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
const HOMEROOM_CLASS = { grade: 'Grade 2', section: 'A', label: 'Grade 2 A', homeroom: true };
const MY_TT = {
  grade: '', section: '', title: 'Priya Menon Timetable',
  periodDefs: [{ code: 'P1', start: '08:50', end: '09:35', isBreak: false }, { code: 'BRK', start: '09:35', end: '09:50', isBreak: true }],
  days: ['MON', 'TUE'],
  slots: [{ id: 'm1', day: 'TUE', periodCode: 'P1', subject: 'Science', room: 'Lab 2', teacherId: 't1', teacherName: 'Priya Menon',
    materialUrl: null, materialName: null, color: null, grade: 'Grade 5', section: 'B', classLabel: 'Grade 5 B' }],
  clashes: [] as any[],
  permissions: { canManageTemplate: false, canEditSlot: false, canAssignTeacher: false },
};
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
  mine = MY_TT as any,
  mineOk = true,
  teachers = [] as { id: string; name: string }[],
} = {}) {
  return (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    if (url.includes('/timetable/mine')) {
      return Promise.resolve({ ok: mineOk, json: async () => (mineOk ? mine : { error: 'Failed to load your timetable' }) });
    }
    if (url.includes('/timetable/teachers')) {
      return Promise.resolve({ ok: true, json: async () => ({ teachers }) });
    }
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
    global.fetch = jest.fn(mockFetchImpl({ classes: [HOMEROOM_CLASS, TEACHER_CLASS] })) as any;
    await render(<TimetableScreen navigation={{}} route={{}} />);
    await screen.findByText('Science');

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/timetable?'), expect.anything()));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/timetable/mine'), expect.anything());
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
      global.fetch = jest.fn(mockFetchImpl({ classes: [HOMEROOM_CLASS, TEACHER_CLASS] })) as any;
    });

    test('opens on My Timetable: their own periods, each with the class to go to', async () => {
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(screen.getByText('My Timetable')).toBeTruthy();
      expect(screen.getByText('Homeroom Class')).toBeTruthy();
      expect(await screen.findByText('Science')).toBeTruthy();
      expect(screen.getByText('Grade 5 B')).toBeTruthy();
      expect(screen.getByText('Lab 2')).toBeTruthy();
      // no pill for every class of the school, no admin Grade picker
      expect(screen.queryByText('Grade 4 A')).toBeNull();
      expect(screen.queryByText('Grade')).toBeNull();
      expect(screen.queryByText('Periods')).toBeNull();
    });

    test('Homeroom Class shows only their homeroom class\'s timetable', async () => {
      const user = userEvent.setup();
      await render(<TimetableScreen navigation={{}} route={{}} />);
      await screen.findByText('Science');

      await user.press(screen.getByText('Homeroom Class'));

      expect(await screen.findByText('P1')).toBeTruthy();
      expect(screen.queryByText('Science')).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/timetable?grade=Grade+2&section=A'), expect.anything());
      expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/timetable?grade=Grade+4'), expect.anything());
    });

    test('no periods assigned yet explains how the timetable fills in', async () => {
      global.fetch = jest.fn(mockFetchImpl({ mine: { ...MY_TT, periodDefs: [], slots: [] } })) as any;
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText('No periods assigned to you yet')).toBeTruthy();
    });

    test('no homeroom class says the school admin assigns it', async () => {
      global.fetch = jest.fn(mockFetchImpl({ classes: [TEACHER_CLASS] })) as any;
      const user = userEvent.setup();
      await render(<TimetableScreen navigation={{}} route={{}} />);
      await screen.findByText('Science');
      await user.press(screen.getByText('Homeroom Class'));
      expect(await screen.findByText('No homeroom class yet')).toBeTruthy();
    });

    test('a double-booked period is called out', async () => {
      global.fetch = jest.fn(mockFetchImpl({
        mine: { ...MY_TT, clashes: [{ day: 'TUE', periodCode: 'P1', classes: ['Grade 5 B', 'Grade 6 A'] }] },
      })) as any;
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText(/You are in two classes at once: Tue P1 \(Grade 5 B, Grade 6 A\)/)).toBeTruthy();
    });

    test('a failure loading their own timetable shows the error state', async () => {
      global.fetch = jest.fn(mockFetchImpl({ mineOk: false })) as any;
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText('Failed to load your timetable')).toBeTruthy();
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

    test('a school admin chooses which teacher takes a period', async () => {
      global.fetch = jest.fn(mockFetchImpl({
        ...ADMIN_CLASSES,
        timetable: {
          ...TT_WITH_PERIODS,
          slots: [{ id: 's1', day: 'MON', periodCode: 'P1', subject: 'Maths', room: null, teacherId: null, teacherName: null, materialUrl: null, materialName: null, color: null }],
          permissions: { canManageTemplate: true, canEditSlot: true, canAssignTeacher: true },
        },
        teachers: [{ id: 't1', name: 'Priya Menon' }, { id: 't2', name: 'Rahul Das' }],
      })) as any;
      const user = userEvent.setup();
      await render(<TimetableScreen navigation={{}} route={{}} />);

      await user.press(await screen.findByText('Maths'));
      await user.press(await screen.findByText('Edit this slot'));
      await user.press(await screen.findByText('Rahul Das'));
      await user.press(screen.getByText('Save'));

      await waitFor(() => {
        const put = (global.fetch as jest.Mock).mock.calls.find(([u, i]) => u.includes('/timetable/slot') && i.method === 'PUT');
        expect(put).toBeTruthy();
        expect(JSON.parse(put[1].body)).toMatchObject({ grade: 'Grade 4', section: 'A', day: 'MON', periodCode: 'P1', subject: 'Maths', teacherId: 't2' });
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
    mockUser = ADMIN;
    global.fetch = jest.fn(mockFetchImpl({ ...ADMIN_CLASSES, timetableOk: false })) as any;
    await render(<TimetableScreen navigation={{}} route={{}} />);
    expect(await screen.findByText('Failed to load timetable')).toBeTruthy();
  });
});

// Screens show their last data instantly from this cache; start every test empty.
beforeEach(() => clearScreenCache());
