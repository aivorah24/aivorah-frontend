import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import SchoolAdminImportHistoryScreen from '../SchoolAdminImportHistoryScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'SchoolAdminImportHistory', name: 'SchoolAdminImportHistory' }),
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
      accentYellow: '#BAA467', accentGreen: '#8FBF8F', accentRed: '#C98A8A',
    },
  }),
}));

const RUN_COMPLETE = { id: '1', type: 'students', fileName: 'students.csv', runByEmail: 'admin@school.test', importedCount: 20, skippedCount: 0, status: 'Completed', createdAt: '2026-01-01T10:00:00Z' };
const RUN_ERRORS = { id: '2', type: 'teachers', fileName: 'teachers.csv', runByEmail: 'other@school.test', importedCount: 8, skippedCount: 2, status: 'Completed with errors', createdAt: '2026-01-02T10:00:00Z' };

function mockFetchImpl(runs: any[] = [RUN_COMPLETE, RUN_ERRORS]) {
  return () => Promise.resolve({ ok: true, json: async () => runs });
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(mockFetchImpl()) as any;
});

describe('SchoolAdminImportHistoryScreen — integration', () => {
  it('loads and displays import runs with counts and status', async () => {
    await render(<SchoolAdminImportHistoryScreen navigation={{}} />);

    await waitFor(() => expect(screen.getByText('2 imports')).toBeTruthy());
    expect(screen.getByText('students.csv')).toBeTruthy();
    expect(screen.getByText('teachers.csv')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Completed with errors')).toBeTruthy();
  });

  it('shows the empty state when there are no imports', async () => {
    global.fetch = jest.fn(mockFetchImpl([])) as any;
    await render(<SchoolAdminImportHistoryScreen navigation={{}} />);

    await waitFor(() => expect(screen.getByText(/No imports yet/)).toBeTruthy());
  });

  it('shows a retry button and reloads on error', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: async () => ({ error: 'boom' }) })) as any;
    const user = userEvent.setup();
    await render(<SchoolAdminImportHistoryScreen navigation={{}} />);

    await waitFor(() => expect(screen.getByText('boom')).toBeTruthy());

    global.fetch = jest.fn(mockFetchImpl([RUN_COMPLETE])) as any;
    await user.press(screen.getByText('Retry'));

    await waitFor(() => expect(screen.getByText('students.csv')).toBeTruthy());
  });

  it('opens the results modal with imported/skipped/total stats on View results', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminImportHistoryScreen navigation={{}} />);

    await waitFor(() => expect(screen.getByText('teachers.csv')).toBeTruthy());
    await user.press(screen.getAllByText('View results')[1]);

    await waitFor(() => expect(screen.getByText('Total rows')).toBeTruthy());
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText(/were skipped/)).toBeTruthy();
  });
});
