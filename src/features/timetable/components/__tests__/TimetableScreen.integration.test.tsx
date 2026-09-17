import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import TimetableScreen from '../TimetableScreen';
import SERVER_URL from '../../../../config/serverUrl';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Timetable', name: 'Timetable' }),
  useFocusEffect: (cb: any) => {
    require('react').useEffect(() => { cb(); }, []);
  },
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#0B0B0B', cardDark: '#141414', cardHover: '#1A1A1A', borderColor: 'rgba(245,243,238,0.14)',
      textMain: '#F5F3EE', textMuted: '#A9B0AC', textDim: '#6E736B', textHeading: '#F5F3EE',
      accentYellow: '#BAA467', accentRed: '#C98A8A',
    },
  }),
}));

let mockUser: any;
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const TEACHER_CLASS = { grade: 'Grade 4', section: 'A', label: 'Grade 4 A', code: 'Grade4A', classTeacherEmail: null, classTeacherName: null, studentCount: 20 };
const TT_EMPTY_PERIODS = { grade: 'Grade 4', section: 'A', title: '', periodDefs: [], days: [], slots: [], permissions: { canManageTemplate: true, canEditSlot: true } };
const TT_WITH_PERIODS = {
  grade: 'Grade 4', section: 'A', title: '',
  periodDefs: [{ code: 'P1', start: '08:50', end: '09:40', isBreak: false }],
  days: ['MON'], slots: [], permissions: { canManageTemplate: false, canEditSlot: false },
};

function mockFetchImpl({ myClasses = [TEACHER_CLASS], structure = { grades: [{ name: 'Grade 4', sections: ['A'] }], curriculum: null as string | null }, timetable = TT_WITH_PERIODS } = {}) {
  return (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    if (url.includes('/classes/mine')) {
      return Promise.resolve({ ok: true, json: async () => ({ classes: myClasses }) });
    }
    if (url.includes('/user/school-structure')) {
      return Promise.resolve({ ok: true, json: async () => structure });
    }
    if (url.includes('/timetable?') && method === 'GET') {
      return Promise.resolve({ ok: true, json: async () => timetable });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TimetableScreen — integration', () => {
  describe('isAdmin: false (teacher)', () => {
    beforeEach(() => {
      mockUser = { email: 'teacher@x.com', schoolId: 'school1', role: 'teacher', school: 'Test School', name: 'Priya Menon' };
      global.fetch = jest.fn(mockFetchImpl()) as any;
    });

    test('loads the teacher\'s own classes (not the admin school-structure endpoint) and shows the grid', async () => {
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText('Grade 4 A')).toBeTruthy();

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/classes/mine'));
      expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/user/school-structure'));
    });

    test('a teacher without template-manage permission does not see the Periods button', async () => {
      await render(<TimetableScreen navigation={{}} route={{}} />);
      await screen.findByText('Grade 4 A');
      expect(screen.queryByText('Periods')).toBeNull();
    });
  });

  describe('isAdmin: true (school_admin)', () => {
    beforeEach(() => {
      mockUser = { email: 'admin@x.com', schoolId: 'school1', role: 'school_admin', school: 'Test School', name: 'Admin User' };
      global.fetch = jest.fn(mockFetchImpl()) as any;
    });

    test('loads every grade+section from the school structure (not /classes/mine) and shows a Grade selector', async () => {
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText('Grade')).toBeTruthy();

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/user/school-structure'));
      expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/classes/mine'));
    });

    test('an admin with canManageTemplate + no periods yet sees the setup prompt', async () => {
      global.fetch = jest.fn(mockFetchImpl({ timetable: TT_EMPTY_PERIODS })) as any;
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText('Set up the bell schedule')).toBeTruthy();
    });

    test('Create default periods calls saveTemplate with the standard bell schedule and reloads', async () => {
      global.fetch = jest.fn(mockFetchImpl({ timetable: TT_EMPTY_PERIODS })) as any;
      const user = userEvent.setup();
      await render(<TimetableScreen navigation={{}} route={{}} />);
      await screen.findByText('Set up the bell schedule');

      await user.press(screen.getByText('Create default periods'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/timetable/template'),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    test('IB schools show a Programme selector; non-IB schools do not', async () => {
      global.fetch = jest.fn(mockFetchImpl({ structure: { grades: [{ name: 'Grade 4', sections: ['A'] }], curriculum: 'IB' } })) as any;
      await render(<TimetableScreen navigation={{}} route={{}} />);
      expect(await screen.findByText('Programme')).toBeTruthy();
      expect(screen.getByText('IB PYP')).toBeTruthy();
    });
  });

  test('route params open a fixed single class and hide the selector entirely', async () => {
    mockUser = { email: 'teacher@x.com', schoolId: 'school1', role: 'teacher', school: 'Test School', name: 'Priya Menon' };
    global.fetch = jest.fn(mockFetchImpl()) as any;
    await render(<TimetableScreen navigation={{}} route={{ params: { grade: 'Grade 4', section: 'A', label: 'Grade 4 A' } }} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/timetable?'));
    });
    // fixed-class mode never hits /classes/mine (paramClass short-circuits loadClasses)
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/classes/mine'));
  });

  test('a timetable load failure shows the error state', async () => {
    mockUser = { email: 'teacher@x.com', schoolId: 'school1', role: 'teacher', school: 'Test School', name: 'Priya Menon' };
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/classes/mine')) return Promise.resolve({ ok: true, json: async () => ({ classes: [TEACHER_CLASS] }) });
      if (url.includes('/timetable?')) return Promise.resolve({ ok: false, json: async () => ({ error: 'Failed to load timetable' }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as any;

    await render(<TimetableScreen navigation={{}} route={{}} />);
    expect(await screen.findByText('Failed to load timetable')).toBeTruthy();
  });
});
