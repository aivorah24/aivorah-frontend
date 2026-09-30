import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ScreenLayout from '../ScreenLayout';

const mockNavigate = jest.fn();
let mockRouteName = 'TeacherDashboard';
let mockRole = 'teacher';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ name: mockRouteName }),
}));
jest.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: mockRole, email: 'x@y.z' } }) }));
jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { bgDark: '#000', cardDark: '#111', cardHover: '#222', borderColor: '#333', textMain: '#fff', textMuted: '#888', primary: '#fa0', accentYellow: '#fa0', accentGreen: '#0f0', accentRed: '#f00' }, isDark: true }),
}));
jest.mock('../../../hooks/useResponsive', () => ({ useResponsive: () => ({ showPermanentSidebar: false }) }));
jest.mock('../Sidebar', () => () => null);
jest.mock('../TeacherAIPanel', () => () => null);
jest.mock('../ParentAIPanel', () => () => null);
jest.mock('../../../screens/shared/announcements/context/AnnouncementProvider', () => ({
  useAnnouncements: () => ({
    bannerAnnouncements: [{ id: 'a1', title: 'School closed Friday', body: 'Heavy rain', severity: 'info' }],
    dismiss: jest.fn(),
  }),
}));

const cases: [string, string][] = [
  ['student', 'Announcements'],
  ['teacher', 'TeacherAnnouncements'],
  ['parent', 'ParentAnnouncements'],
  ['school_admin', 'SchoolAdminAnnouncements'],
];

beforeEach(() => { mockNavigate.mockReset(); mockRouteName = 'Somewhere'; });

test.each(cases)('%s sees unread announcements on any page, and opening one goes to %s', async (role, route) => {
  mockRole = role;
  await render(<ScreenLayout hideAIPanel><Text>page</Text></ScreenLayout>);
  await fireEvent.press(await screen.findByText(/School closed Friday/));
  expect(mockNavigate).toHaveBeenCalledWith(route, { openId: 'a1' });
});

test('the banner is not repeated on the announcements page itself', async () => {
  mockRole = 'teacher';
  mockRouteName = 'TeacherAnnouncements';
  await render(<ScreenLayout hideAIPanel><Text>page</Text></ScreenLayout>);
  expect(screen.queryByText(/School closed Friday/)).toBeNull();
  expect(screen.getByText('page')).toBeTruthy();
});
