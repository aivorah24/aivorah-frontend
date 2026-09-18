import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import SchoolAdminTeachersScreen from '../../SchoolAdminTeachersScreen';
import SCHOOL_ADMIN_SERVER_URL from '../../../../../config/schoolAdminServerUrl';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'SchoolAdminTeachers', name: 'SchoolAdminTeachers' }),
  useFocusEffect: (cb: any) => {
    require('react').useEffect(() => { cb(); }, []);
  },
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Admin User', email: 'admin@school.test', role: 'school_admin' } }),
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#0B0B0B', cardDark: '#141414', cardHover: '#1A1A1A', borderColor: 'rgba(245,243,238,0.14)',
      textMain: '#F5F3EE', textMuted: '#A9B0AC', textDim: '#6E736B', textHeading: '#F5F3EE',
      accentYellow: '#BAA467', accentGreen: '#4CAF50', accentOrange: '#D07A3E', accentRed: '#C98A8A',
    },
  }),
}));

const TEACHER_A = { id: 't1', name: 'Alice Adams', email: 'alice@x.com', subjects: ['Maths'], teaches: [{ curriculum: 'CBSE', grade: 'Grade 6', subjects: ['Maths'] }], grade: null, curriculum: null, status: 'active', joinedAt: '2026-01-01' };
const TEACHER_B = { id: 't2', name: 'Bob Brown', email: 'bob@x.com', subjects: [], teaches: [], grade: 'Grade 7', curriculum: 'IB PYP', status: 'invited', joinedAt: '2026-01-02' };

function mockFetchImpl(teachers = [TEACHER_A, TEACHER_B]) {
  return () => Promise.resolve({ ok: true, json: async () => teachers });
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(mockFetchImpl()) as any;
});

describe('SchoolAdminTeachersScreen — integration', () => {
  test('resolves from loading to showing teacher rows', async () => {
    await render(<SchoolAdminTeachersScreen navigation={{}} />);
    expect(await screen.findByText('Alice Adams')).toBeTruthy();
    expect(screen.getByText('Bob Brown')).toBeTruthy();
    expect(screen.getByText('CBSE · Grade 6')).toBeTruthy();
    expect(screen.getByText('IB PYP · Grade 7')).toBeTruthy();
    expect(screen.getByText('Not assigned')).toBeTruthy();

    expect(global.fetch).toHaveBeenCalledWith(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/teachers?adminEmail=admin%40school.test`);
  });

  test('shows the empty state when there are no teachers', async () => {
    global.fetch = jest.fn(mockFetchImpl([])) as any;
    await render(<SchoolAdminTeachersScreen navigation={{}} />);
    expect(await screen.findByText('No teachers yet. Add your first teacher to get started.')).toBeTruthy();
  });

  test('shows an error state on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Failed to load teachers' }) }) as any;
    await render(<SchoolAdminTeachersScreen navigation={{}} />);
    expect(await screen.findByText('Failed to load teachers')).toBeTruthy();
  });

  test('pressing Edit navigates to SchoolAdminEditTeacher with the teacher payload', async () => {
    const navigate = jest.fn();
    await render(<SchoolAdminTeachersScreen navigation={{ navigate }} />);
    await screen.findByText('Alice Adams');

    await waitFor(() => expect(screen.getByLabelText('Edit Alice Adams')).toBeTruthy());
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(screen.getByLabelText('Edit Alice Adams'));

    expect(navigate).toHaveBeenCalledWith('SchoolAdminEditTeacher', {
      teacher: { id: 't1', name: 'Alice Adams', email: 'alice@x.com', teaches: TEACHER_A.teaches },
    });
  });

  test('Add Teacher and Import Teachers actions navigate correctly', async () => {
    const navigate = jest.fn();
    await render(<SchoolAdminTeachersScreen navigation={{ navigate }} />);
    await screen.findByText('Alice Adams');

    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(screen.getByText('Add Teacher'));
    expect(navigate).toHaveBeenCalledWith('SchoolAdminAddTeacher');

    fireEvent.press(screen.getByText('Import Teachers'));
    expect(navigate).toHaveBeenCalledWith('SchoolAdminTeacherBulkImport');
  });
});
