// Students reach Current Affairs from the sidebar (web) and the drawer (phone).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Sidebar from '../Sidebar';
import DrawerContent from '../DrawerContent';

let mockUser: any;
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: jest.fn(), updateUser: jest.fn(), switchRole: jest.fn(), beginAddParentProfile: jest.fn() }),
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
jest.mock('../SwitchProfile', () => ({ SwitchProfile: () => null }));

const STUDENT = { email: 's@x.com', role: 'student', roles: ['student'], grade: 'Grade 6' };
const TEACHER = { email: 't@x.com', role: 'teacher', roles: ['teacher'], schoolId: 'sc1' };

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: async () => ({}) })) as any;
});

test('sidebar: students see Current Affairs and it opens the digest', async () => {
  mockUser = STUDENT;
  const onNavigate = jest.fn();
  await render(<Sidebar currentScreen="Dashboard" onNavigate={onNavigate} />);
  fireEvent.press(screen.getByText('Current Affairs'));
  expect(onNavigate).toHaveBeenCalledWith('CurrentAffairs', undefined);
});

test('drawer: students see Current Affairs and it opens the digest', async () => {
  mockUser = STUDENT;
  const navigation = { navigate: jest.fn(), closeDrawer: jest.fn() };
  await render(<DrawerContent state={{ routes: [{ name: 'Dashboard' }], index: 0 }} navigation={navigation} />);
  fireEvent.press(screen.getByText('Current Affairs'));
  expect(navigation.navigate).toHaveBeenCalledWith('CurrentAffairs', undefined);
});

test('teachers do not get the student-only item', async () => {
  mockUser = TEACHER;
  await render(<Sidebar currentScreen="TeacherDashboard" onNavigate={jest.fn()} />);
  expect(screen.queryByText('Current Affairs')).toBeNull();
});
