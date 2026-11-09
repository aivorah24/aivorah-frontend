// Current Affairs lives inside The World & You (its Current Affairs tab), so
// the menus have no separate item; World & You stays highlighted on its pages.
import React from 'react';
import { StyleSheet } from 'react-native';
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

test('sidebar: no separate Current Affairs item; The World & You opens it', async () => {
  mockUser = STUDENT;
  const onNavigate = jest.fn();
  await render(<Sidebar currentScreen="Dashboard" onNavigate={onNavigate} />);
  expect(screen.queryByText('Current Affairs')).toBeNull();
  fireEvent.press(screen.getByText('The World & You'));
  expect(onNavigate).toHaveBeenCalledWith('WorldAndYou', undefined);
});

test('drawer: no separate Current Affairs item', async () => {
  mockUser = STUDENT;
  const navigation = { navigate: jest.fn(), closeDrawer: jest.fn() };
  await render(<DrawerContent state={{ routes: [{ name: 'Dashboard' }], index: 0 }} navigation={navigation} />);
  expect(screen.queryByText('Current Affairs')).toBeNull();
  expect(screen.getByText('The World & You')).toBeTruthy();
});

// The menu item's label style: the active one is gold/bold, others muted.
async function worldAndYouLabelStyle(currentScreen: string) {
  const view = await render(<Sidebar currentScreen={currentScreen} onNavigate={jest.fn()} />);
  const style = StyleSheet.flatten(view.getByText('The World & You').props.style);
  await view.unmount();
  return style;
}

test.each(['CurrentAffairs', 'CurrentAffairsStory', 'CurrentAffairsQuiz'])(
  'sidebar keeps The World & You highlighted on %s', async (current) => {
    mockUser = STUDENT;
    const active = await worldAndYouLabelStyle('WorldAndYou');
    const inactive = await worldAndYouLabelStyle('Dashboard');
    expect(active).not.toEqual(inactive);
    expect(await worldAndYouLabelStyle(current)).toEqual(active);
  });

test('teachers do not see it either', async () => {
  mockUser = TEACHER;
  await render(<Sidebar currentScreen="TeacherDashboard" onNavigate={jest.fn()} />);
  expect(screen.queryByText('Current Affairs')).toBeNull();
});
