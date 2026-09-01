// Integration test for the "New Assignment" modal's subject list. Regression
// coverage for a real bug: the subject chips were hardcoded to
// IB_PYP_SUBJECTS regardless of the selected child's curriculum, so e.g. a
// CBSE Grade 11 child would only ever see IB PYP subjects (Mathematics,
// Arts, ICT...) and never CBSE-appropriate ones (Accountancy, Business
// Studies...). The chips must now come from /curriculum/subjects, scoped to
// the child's own curriculum + grade.

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import ParentAssignmentsScreen from '../../ParentAssignmentsScreen';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => { cb(); },
  useNavigation: () => ({ navigate: jest.fn(), openDrawer: jest.fn() }),
  useRoute: () => ({ name: 'ParentAssignments' }),
}));
jest.mock('../../../../../hooks/useResponsive', () => ({
  useResponsive: () => ({ showPermanentSidebar: false }),
}));
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@example.com' } }),
}));
jest.mock('../../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: 0, unreadAssignments: 0, unreadChallenges: 0, unreadEvents: 0,
    unreadJoinRequests: 0, latestNotif: null, notificationItems: [],
    clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(),
    clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn(),
  }),
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textMuted: '#000', textDim: '#000', accentYellow: '#000', accentRed: '#000',
      background: '#fff', card: '#fff', border: '#ccc', text: '#000',
    },
  }),
}));

const CBSE_CHILD = { id: 'child-cbse', name: 'Riya', grade: 'Grade 11', curriculum: 'CBSE' };

function mockFetchByUrl(handlers: Record<string, any>) {
  (global as any).fetch = jest.fn((url: string) => {
    const match = Object.keys(handlers).find((k) => url.includes(k));
    const body = match ? handlers[match] : {};
    return Promise.resolve({ ok: true, json: async () => body });
  });
}

describe('ParentAssignmentsScreen - New Assignment subject list', () => {
  test('shows the CBSE child\'s real subjects, not the hardcoded IB PYP list', async () => {
    mockFetchByUrl({
      '/parent/': [CBSE_CHILD],
      '/curriculum/subjects': { subjects: [{ name: 'Accountancy' }, { name: 'Business Studies' }, { name: 'Economics' }] },
      '/assignments?studentId=': [],
      '/student/': {},
      '/curriculum': { topics: [] },
    });

    await render(<ParentAssignmentsScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);

    await waitFor(() => expect(screen.getAllByText('Riya · Grade 11').length).toBeGreaterThan(0));
    fireEvent.press(screen.getByText('New'));

    await waitFor(() => expect(screen.getByText('Accountancy')).toBeTruthy());
    expect(screen.getByText('Business Studies')).toBeTruthy();
    expect(screen.queryByText('Arts')).toBeNull();
    expect(screen.queryByText('ICT')).toBeNull();
  });

  test('falls back to the IB PYP default list when /curriculum/subjects returns nothing', async () => {
    mockFetchByUrl({
      '/parent/': [{ id: 'child-ib', name: 'Kai', grade: 'Grade 3', curriculum: 'IB PYP' }],
      '/curriculum/subjects': { subjects: [] },
      '/assignments?studentId=': [],
      '/student/': {},
      '/curriculum': { topics: [] },
    });

    await render(<ParentAssignmentsScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);

    await waitFor(() => expect(screen.getAllByText('Kai · Grade 3').length).toBeGreaterThan(0));
    fireEvent.press(screen.getByText('New'));

    await waitFor(() => expect(screen.getByText('Mathematics')).toBeTruthy());
    expect(screen.getByText('Arts')).toBeTruthy();
  });
});
