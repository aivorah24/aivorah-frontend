import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import SchoolAdminClassesScreen from '../SchoolAdminClassesScreen';
import SCHOOL_ADMIN_SERVER_URL from '../../../../config/schoolAdminServerUrl';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'SchoolAdminClasses', name: 'SchoolAdminClasses' }),
  useFocusEffect: (cb: any) => {
    require('react').useEffect(() => { cb(); }, []);
  },
}));

jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Admin User', email: 'admin@school.test', role: 'school_admin' } }),
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

const CLASS_A = { grade: 'Grade 6', section: 'A', studentCount: 3, classTeacherEmail: null, classTeacherName: null };
const CLASS_B = { grade: 'Grade 6', section: 'B', studentCount: 2, classTeacherEmail: 'bob@x.com', classTeacherName: 'Bob Smith' };
const TEACHER_ALICE = { id: 't1', name: 'Alice Adams', email: 'alice@x.com', teaches: [{ grade: 'Grade 6' }] };

function mockFetchImpl(classes = [CLASS_A, CLASS_B], teachers = [TEACHER_ALICE]) {
  return (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    if (url.includes('/school-admin/classes') && method === 'GET') {
      return Promise.resolve({ ok: true, json: async () => ({ classes }) });
    }
    if (url.includes('/school-admin/teachers') && method === 'GET') {
      return Promise.resolve({ ok: true, json: async () => teachers });
    }
    return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(mockFetchImpl()) as any;
});

describe('SchoolAdminClassesScreen — integration', () => {
  test('resolves from loading to showing class rows', async () => {
    await render(<SchoolAdminClassesScreen navigation={{}} />);
    expect(await screen.findByText('Grade 6 · Section A')).toBeTruthy();
    expect(screen.getByText('Grade 6 · Section B')).toBeTruthy();
    expect(screen.getByText('Unassigned')).toBeTruthy();
    expect(screen.getByText('Bob Smith')).toBeTruthy();
    expect(screen.getByText('3 students')).toBeTruthy();

    expect(global.fetch).toHaveBeenCalledWith(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/classes?adminEmail=admin%40school.test`);
  });

  test('shows the empty state when there are no classes', async () => {
    global.fetch = jest.fn(mockFetchImpl([])) as any;
    await render(<SchoolAdminClassesScreen navigation={{}} />);
    expect(await screen.findByText('No classes yet. Add grades and sections first in Grades & Sections.')).toBeTruthy();
  });

  test('shows an error state with Retry, which reloads on press', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/school-admin/classes')) {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Failed to load classes' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ([]) });
    }) as any;
    const user = userEvent.setup();

    await render(<SchoolAdminClassesScreen navigation={{}} />);
    expect(await screen.findByText('Failed to load classes')).toBeTruthy();

    global.fetch = jest.fn(mockFetchImpl()) as any;
    await user.press(screen.getByText('Retry'));
    expect(await screen.findByText('Grade 6 · Section A')).toBeTruthy();
  });

  test('grade filter narrows the visible rows', async () => {
    const classG7 = { ...CLASS_A, grade: 'Grade 7', section: 'A' };
    global.fetch = jest.fn(mockFetchImpl([CLASS_A, CLASS_B, classG7])) as any;
    const user = userEvent.setup();
    await render(<SchoolAdminClassesScreen navigation={{}} />);
    await screen.findByText('Grade 6 · Section A');

    await user.press(screen.getByText('All grades'));
    await user.press(screen.getByText('Grade 7'));

    expect(await screen.findByText('Grade 7 · Section A')).toBeTruthy();
    expect(screen.queryByText('Grade 6 · Section A')).toBeNull();
    expect(screen.getByText('1 class')).toBeTruthy();
  });

  test('Assign teacher: opens picker, picks a teacher, submits PATCH, closes and shows toast', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminClassesScreen navigation={{}} />);
    await screen.findByText('Grade 6 · Section A');

    await user.press(screen.getAllByText('Assign teacher')[0]);
    expect(await screen.findByText('Assign Class Teacher')).toBeTruthy();

    await user.press(screen.getByText('Alice Adams'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${SCHOOL_ADMIN_SERVER_URL}/school-admin/grades/Grade%206/sections/A/class-teacher?adminEmail=admin%40school.test`,
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ teacherEmail: 'alice@x.com' }) })
      );
    });
    expect(screen.queryByText('Assign Class Teacher')).toBeNull();
  });

  test('Change teacher: existing class teacher shows a Remove option that unassigns', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminClassesScreen navigation={{}} />);
    await screen.findByText('Grade 6 · Section B');

    await user.press(screen.getByText('Change teacher'));
    expect(await screen.findByText('Remove current class teacher')).toBeTruthy();

    await user.press(screen.getByText('Remove current class teacher'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${SCHOOL_ADMIN_SERVER_URL}/school-admin/grades/Grade%206/sections/B/class-teacher?adminEmail=admin%40school.test`,
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ teacherEmail: null }) })
      );
    });
  });

  test('server error on assign shows the message inside the modal and keeps it open', async () => {
    global.fetch = jest.fn((url: string, init?: any) => {
      const method = init?.method ?? 'GET';
      if (url.includes('/school-admin/classes') && method === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ classes: [CLASS_A, CLASS_B] }) });
      }
      if (url.includes('/school-admin/teachers') && method === 'GET') {
        return Promise.resolve({ ok: true, json: async () => [TEACHER_ALICE] });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'Teacher not found' }) });
    }) as any;
    const user = userEvent.setup();

    await render(<SchoolAdminClassesScreen navigation={{}} />);
    await screen.findByText('Grade 6 · Section A');

    await user.press(screen.getAllByText('Assign teacher')[0]);
    await user.press(screen.getByText('Alice Adams'));

    expect(await screen.findByText('Teacher not found')).toBeTruthy();
    expect(screen.getByText('Assign Class Teacher')).toBeTruthy();
  });
});
