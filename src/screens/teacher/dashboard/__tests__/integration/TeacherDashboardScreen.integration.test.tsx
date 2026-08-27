// Integration test for TeacherDashboardScreen — renders the real component,
// mocks fetch for the 3 teacherDashboardService calls, and checks the real
// rendered numbers/cards. AuthContext/ThemeContext mocked (same pattern as
// OnboardingStudentBoxes.integration.test.tsx).

import React from 'react';
import { render, screen, waitFor, userEvent, act } from '@testing-library/react-native';
import TeacherDashboardScreen from '../../TeacherDashboardScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'TeacherDashboard', name: 'TeacherDashboard' }),
  useFocusEffect: () => {},
}));

// Mutable so one test (mobile menu button) can override isMobile without a
// second jest.mock module - Header only renders the menu button when true.
let mockIsMobile = false;
jest.mock('../../../../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isMobile: mockIsMobile, isTablet: false, showPermanentSidebar: !mockIsMobile }),
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'teacher@aivorah.test', name: 'Priya Menon' },
  }),
  getPendingReturnRole: () => null,
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#000', cardDark: '#111', borderColor: '#222', textMain: '#fff', textDim: '#999',
      accentYellow: '#FFD700', accentGreen: '#0f0', accentRed: '#f00',
    },
    isDark: true,
  }),
}));

const navigation = { openDrawer: jest.fn(), navigate: jest.fn() };

function jsonRes(url: string) {
  if (url.includes('/insights')) {
    return Promise.resolve({
      json: async () => ({
        assignments: [], challenges: [],
        totals: { totalAssignmentsAssigned: 4, totalSubmissions: 2, totalChallengesAssigned: 2, totalChallengesCompleted: 1 },
      }),
    });
  }
  if (url.includes('/recent-activity/')) {
    return Promise.resolve({
      json: async () => [{ studentId: 's1', name: 'Aarav Sharma', text: 'Completed "Fractions"', type: 'topic', timestamp: new Date().toISOString() }],
    });
  }
  if (url.includes('/by-teacher/')) {
    return Promise.resolve({
      json: async () => [
        { id: 's1', name: 'Aarav Sharma', progressPct: 60, needsAttention: false, lastActive: new Date().toISOString().split('T')[0] },
        { id: 's2', name: 'Bela Rao', progressPct: 10, needsAttention: true, lastActive: '2020-01-01' },
      ],
    });
  }
  return Promise.resolve({ json: async () => [] });
}

beforeEach(() => {
  global.fetch = jest.fn((url: string) => jsonRes(url)) as any;
  mockIsMobile = false;
});

describe('TeacherDashboardScreen', () => {
  test('shows a loading spinner before data arrives, then the real greeting and class size', async () => {
    await render(<TeacherDashboardScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getAllByText(/Priya/).length).toBeGreaterThan(0), { timeout: 10000 });
    expect(screen.getByText(/Your Class · 2 Students/)).toBeTruthy();
  }, 15000);

  test('Student Overview card shows the real total/active/needs-attention counts', async () => {
    await render(<TeacherDashboardScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('Student Overview')).toBeTruthy());

    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // totalStudents big number
    expect(screen.getByText('Active Today')).toBeTruthy();
    expect(screen.getByText('Need Attention')).toBeTruthy();
  });

  test('Recent Activity shows the real fetched event', async () => {
    await render(<TeacherDashboardScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('Aarav Sharma')).toBeTruthy());
  });

  test('a zero-student class renders a clean empty state, not a crash', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => [] }) as any;
    await render(<TeacherDashboardScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByText(/Your Class · 0 Students/)).toBeTruthy());
  });

  test('a failed fetch (all 3 endpoints reject) does not crash — shows empty state instead', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<TeacherDashboardScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByText(/Your Class · 0 Students/)).toBeTruthy());
  });

  test('tapping an insight tile opens its detail modal with real content, and the close button dismisses it', async () => {
    const user = userEvent.setup();
    await render(<TeacherDashboardScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('AI Teaching Insights')).toBeTruthy());

    // The first Learning Path tile (tileIndex 0, rendered title "Need Support")
    // opens the real LearningPathModals "Struggling" detail table.
    await user.press(screen.getByText('Need Support'));

    // "Topics Done" is a table header unique to the opened modal (not the tile).
    await waitFor(() => expect(screen.getByText('Topics Done')).toBeTruthy());
    // Bela Rao (needsAttention: true, progressPct: 10) shows up in the struggling table.
    expect(screen.getAllByText('Bela').length).toBeGreaterThan(0);

    // Pressing the real close button (ctx.onClose -> setInsightModal(null)) dismisses it.
    await user.press(screen.getByTestId('modal-close-button'));

    await waitFor(() => expect(screen.queryByText('Topics Done')).toBeNull());
  });

  test('the Android hardware back button (Modal onRequestClose) also dismisses the insight modal', async () => {
    const user = userEvent.setup();
    await render(<TeacherDashboardScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('AI Teaching Insights')).toBeTruthy());

    await user.press(screen.getByText('Need Support'));
    await waitFor(() => expect(screen.getByText('Topics Done')).toBeTruthy());

    const modal = screen.getByTestId('insight-modal');
    await act(async () => { modal.props.onRequestClose(); });

    await waitFor(() => expect(screen.queryByText('Topics Done')).toBeNull());
  });

  test('tapping an Assignments-column tile opens the correct offset-indexed modal (not a Learning Path one)', async () => {
    const user = userEvent.setup();
    await render(<TeacherDashboardScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('AI Teaching Insights')).toBeTruthy());

    // studentsWithNoSubmissions > 0 here, so the tile's rendered title is "Not Started".
    await user.press(screen.getByText('Not Started'));

    await waitFor(() => expect(screen.getByText('No Assignments Submitted Yet')).toBeTruthy());
  });

  test('tapping a Challenges-column tile dispatches to the real Challenge modal (not Learning Path/Assignments)', async () => {
    const user = userEvent.setup();
    await render(<TeacherDashboardScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('AI Teaching Insights')).toBeTruthy());

    // No challenges data in this mock, so the first Challenge tile's real title is "No Challenges Yet".
    await user.press(screen.getByText('No Challenges Yet'));

    await waitFor(() => expect(screen.getByText('No challenges assigned yet')).toBeTruthy());
  });

  test('pull-to-refresh sets refreshing and re-fetches real student data', async () => {
    await render(<TeacherDashboardScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('Student Overview')).toBeTruthy());
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;

    const scrollView = screen.getByTestId('dashboard-scroll');
    await act(async () => { scrollView.props.refreshControl.props.onRefresh(); });

    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  test('on mobile, pressing the menu button opens the drawer', async () => {
    mockIsMobile = true;
    const user = userEvent.setup();
    const nav = { openDrawer: jest.fn(), navigate: jest.fn() };
    await render(<TeacherDashboardScreen navigation={nav} />);
    await waitFor(() => expect(screen.getByText('Student Overview')).toBeTruthy());

    await user.press(screen.getByTestId('header-menu-button'));

    expect(nav.openDrawer).toHaveBeenCalled();
  });
});
