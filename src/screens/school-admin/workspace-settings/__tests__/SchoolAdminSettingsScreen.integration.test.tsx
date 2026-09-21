import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import SchoolAdminSettingsScreen from '../SchoolAdminSettingsScreen';
import SCHOOL_ADMIN_SERVER_URL from '../../../../config/schoolAdminServerUrl';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'SchoolAdminSettings', name: 'SchoolAdminSettings' }),
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

const SCHOOL = { id: '1', name: 'The Shri Ram Academy', academicYear: '2026-27', contactEmail: 'office@tsra.edu' };

function mockFetchImpl() {
  return (url: string, init?: any) => {
    if (url.includes('/school-admin/overview')) {
      return Promise.resolve({ ok: true, json: async () => ({ school: SCHOOL }) });
    }
    if (url.includes('/branding/logos')) {
      return Promise.resolve({ ok: true, json: async () => ({ schoolLogoUrl: null }) });
    }
    if (url.includes('/school-admin/workspace-settings') && init?.method === 'PATCH') {
      const body = JSON.parse(init.body);
      if (!body.name?.trim()) return Promise.resolve({ ok: false, json: async () => ({ error: 'School name is required.' }) });
      return Promise.resolve({ ok: true, json: async () => ({ school: { ...SCHOOL, ...body } }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(mockFetchImpl()) as any;
});

describe('SchoolAdminSettingsScreen — integration', () => {
  it('loads and displays the current workspace settings read-only', async () => {
    await render(<SchoolAdminSettingsScreen navigation={{}} />);

    await waitFor(() => expect(screen.getByText('The Shri Ram Academy')).toBeTruthy());
    expect(screen.getByText('2026–27')).toBeTruthy();
    expect(screen.getByText('office@tsra.edu')).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/overview`));
  });

  it('enters edit mode and saves a name change', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminSettingsScreen navigation={{}} />);

    await waitFor(() => expect(screen.getByText('The Shri Ram Academy')).toBeTruthy());
    await user.press(screen.getByText('Edit'));

    const nameInput = screen.getByPlaceholderText("Your school's name");
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed Academy');
    await user.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('Renamed Academy')).toBeTruthy());
  });

  it('shows a validation error and does not save on empty name', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminSettingsScreen navigation={{}} />);

    await waitFor(() => expect(screen.getByText('The Shri Ram Academy')).toBeTruthy());
    await user.press(screen.getByText('Edit'));

    const nameInput = screen.getByPlaceholderText("Your school's name");
    await user.clear(nameInput);
    await user.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('School name cannot be empty.')).toBeTruthy());
  });

  it('cancel exits edit mode without saving', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminSettingsScreen navigation={{}} />);

    await waitFor(() => expect(screen.getByText('The Shri Ram Academy')).toBeTruthy());
    await user.press(screen.getByText('Edit'));
    await user.press(screen.getByText('Cancel'));

    expect(screen.queryByText('Save Changes')).toBeNull();
    expect(screen.getByText('The Shri Ram Academy')).toBeTruthy();
  });
});
