import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import SchoolAdminParentsScreen from '../../SchoolAdminParentsScreen';
import SCHOOL_ADMIN_SERVER_URL from '../../../../../config/schoolAdminServerUrl';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'SchoolAdminParents', name: 'SchoolAdminParents' }),
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
      accentYellow: '#BAA467', accentGreen: '#4CAF50', accentRed: '#C98A8A',
    },
  }),
}));

const PARENT_A = { id: 'p1', name: 'Alice Adams', email: 'alice@x.com', linkedStudents: ['Vihaan Kapoor'], status: 'active', joinedAt: '2026-01-01' };
const PARENT_B = { id: 'p2', name: 'Bob Brown', email: 'bob@x.com', linkedStudents: [], status: 'invited', joinedAt: '2026-01-02' };

function mockFetchImpl(parents = [PARENT_A, PARENT_B]) {
  return () => Promise.resolve({ ok: true, json: async () => parents });
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(mockFetchImpl()) as any;
});

describe('SchoolAdminParentsScreen — integration', () => {
  test('resolves from loading to showing parent rows', async () => {
    await render(<SchoolAdminParentsScreen navigation={{}} />);
    expect(await screen.findByText('Alice Adams')).toBeTruthy();
    expect(screen.getByText('Bob Brown')).toBeTruthy();
    expect(screen.getByText('Vihaan Kapoor')).toBeTruthy();
    expect(screen.getByText('None linked')).toBeTruthy();

    expect(global.fetch).toHaveBeenCalledWith(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/parents?adminEmail=admin%40school.test`);
  });

  test('shows the empty state when there are no parents', async () => {
    global.fetch = jest.fn(mockFetchImpl([])) as any;
    await render(<SchoolAdminParentsScreen navigation={{}} />);
    expect(await screen.findByText('No parents yet. Add your first parent to get started.')).toBeTruthy();
  });

  test('shows an error state on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Failed to load parents' }) }) as any;
    await render(<SchoolAdminParentsScreen navigation={{}} />);
    expect(await screen.findByText('Failed to load parents')).toBeTruthy();
  });

  test('tapping a row opens the detail modal, which closes on Close', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminParentsScreen navigation={{}} />);
    await screen.findByText('Alice Adams');

    await user.press(screen.getByLabelText('View Alice Adams'));
    expect(await screen.findByText('Joined')).toBeTruthy();
    expect(screen.getByText('2026-01-01')).toBeTruthy();

    await user.press(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByText('Joined')).toBeNull());
  });

  test('Add Parent action navigates to SchoolAdminAddParent', async () => {
    const navigate = jest.fn();
    await render(<SchoolAdminParentsScreen navigation={{ navigate }} />);
    await screen.findByText('Alice Adams');

    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(screen.getByText('Add Parent'));
    expect(navigate).toHaveBeenCalledWith('SchoolAdminAddParent');
  });
});
