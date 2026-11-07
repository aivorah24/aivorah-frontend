// Clicking the Aivorah logo / brand name in the sidebar (web) or drawer (phone)
// opens the signed-in user's own dashboard - no "Leave to Home?" prompt, no sign-out.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Sidebar from '../Sidebar';
import DrawerContent from '../DrawerContent';
import { darkColors } from '../../../theme';

let mockUser: any;
const mockLogout = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout, updateUser: jest.fn(), switchRole: jest.fn(), beginAddParentProfile: jest.fn() }),
}));
jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: require('../../../theme').darkColors, themeMode: 'dark', setThemeMode: jest.fn(), isDark: true }),
}));
jest.mock('../../../context/NotificationContext', () => ({
  useNotification: () => ({ unreadCount: 0, unreadAssignments: 0, unreadChallenges: 0 }),
}));
jest.mock('../../../screens/shared/announcements/context/AnnouncementProvider', () => ({
  useAnnouncements: () => ({ bannerAnnouncements: [] }),
}));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../../../constants/adminEmails', () => ({ isAdminEmail: (e?: string) => e === 'platform@aivorah.test' }));
jest.mock('../SwitchProfile', () => ({ SwitchProfile: () => null }));

void darkColors;

const CASES: [string, any, string][] = [
  ['student',        { email: 's@x.com', role: 'student', roles: ['student'], schoolId: 'sc1', grade: 'Grade 8' }, 'Dashboard'],
  ['teacher',        { email: 't@x.com', role: 'teacher', roles: ['teacher'], schoolId: 'sc1' }, 'TeacherDashboard'],
  ['parent',         { email: 'p@x.com', role: 'parent', roles: ['parent'], schoolId: 'sc1' }, 'ParentDashboard'],
  ['school admin',   { email: 'a@x.com', role: 'school_admin', roles: ['school_admin'], schoolId: 'sc1' }, 'SchoolAdminDashboard'],
  ['platform admin', { email: 'platform@aivorah.test', role: 'teacher', roles: ['teacher'] }, 'PlatformOverview'],
];

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: async () => ({}) })) as any;
});

describe.each(CASES)('%s', (_label, user, dashboard) => {
  test('sidebar logo opens their dashboard without asking or signing out', async () => {
    mockUser = user;
    const onNavigate = jest.fn();
    await render(<Sidebar currentScreen="Settings" onNavigate={onNavigate} />);
    fireEvent.press(screen.getByTestId('logo-home'));
    expect(onNavigate).toHaveBeenCalledWith(dashboard, undefined);
    expect(screen.queryByText('Leave to Home?')).toBeNull();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  test('drawer logo opens their dashboard without asking or signing out', async () => {
    mockUser = user;
    const navigation = { navigate: jest.fn(), closeDrawer: jest.fn() };
    await render(<DrawerContent state={{ routes: [{ name: 'Settings' }], index: 0 }} navigation={navigation} />);
    fireEvent.press(screen.getByTestId('logo-home'));
    expect(navigation.navigate).toHaveBeenCalledWith(dashboard, undefined);
    expect(screen.queryByText('Leave to Home?')).toBeNull();
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
