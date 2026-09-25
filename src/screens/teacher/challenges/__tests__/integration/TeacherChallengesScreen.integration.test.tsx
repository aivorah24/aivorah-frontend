import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import TeacherChallengesScreen from '../../TeacherChallengesScreen';
import * as service from '../../services/teacherChallengesService';

jest.mock('../../services/teacherChallengesService', () => ({
  __esModule: true,
  fetchStudentsByTeacher: jest.fn(),
  fetchTeacherPreferences: jest.fn(),
  fetchChallenges: jest.fn(),
  fetchClassLeaderboard: jest.fn(),
  fetchStudentWeekly: jest.fn(),
  assignChallenge: jest.fn(),
  fetchTeacherAssignments: jest.fn(),
}));

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => mockUseFocusEffect(cb),
  useNavigation: () => ({ navigate: jest.fn(), openDrawer: jest.fn() }),
  useRoute: () => ({ name: 'TeacherChallenges' }),
}));

jest.mock('../../../../../hooks/useResponsive', () => ({
  useResponsive: () => ({ showPermanentSidebar: false }),
}));

// Hoisted to a stable module-level constant - an inline object literal here
// gets recreated on every useAuth() call, which (via ScreenLayout's own
// effects depending on `user`) causes a silent infinite render loop, not an
// error (documented gotcha, see memory teacher_students_feature_testing.md).
const MOCK_TEACHER_USER = { email: 'teacher@x.com', name: 'Teacher T', teaches: [{ grade: 'Grade 3', curriculum: 'CBSE' }] };
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: MOCK_TEACHER_USER }),
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
    isDark: false,
    colors: {
      bgDark: '#000', cardDark: '#111', cardHover: '#222', borderColor: '#333',
      textMain: '#fff', textMuted: '#ccc', textDim: '#999',
      accentYellow: '#D9A93E', accentGreen: '#0a0', accentRed: '#a00',
      background: '#fff', card: '#fff', border: '#ccc', text: '#000',
    },
  }),
}));

const mockedService = service as jest.Mocked<typeof service>;

const CHALLENGES = [
  { id: 'c1', title: 'Multiplication Mystery', description: 'desc', grade: 'Grade 3', curriculum: 'CBSE', subject: 'Math', chapterId: 1, topic: 't', difficulty: 'Easy' as const, xpReward: 140, questionCount: 5, timeLimitMinutes: 10, type: 'pattern_challenge', category: 'Pattern Challenge' },
  { id: 'c2', title: 'Sharing Fairly', description: 'desc2', grade: 'Grade 3', curriculum: 'CBSE', subject: 'Math', chapterId: 2, topic: 't2', difficulty: 'Medium' as const, xpReward: 140, questionCount: 5, timeLimitMinutes: 10, type: 'real_world_application', category: 'Real-World Application' },
];

describe('TeacherChallengesScreen (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFocusEffect.mockImplementation((cb: any) => cb());
    mockedService.fetchStudentsByTeacher.mockResolvedValue([{ id: 's1', name: 'Alice', grade: 'Grade 3' }]);
    mockedService.fetchTeacherPreferences.mockResolvedValue({ teaches: [{ grade: 'Grade 3' }] });
    mockedService.fetchChallenges.mockResolvedValue(CHALLENGES);
    mockedService.fetchClassLeaderboard.mockResolvedValue([]);
    mockedService.fetchStudentWeekly.mockResolvedValue(null);
    mockedService.fetchTeacherAssignments.mockResolvedValue([]);
  });

  it('renders challenges grouped by real category, not a hardcoded type list (regression for the type-taxonomy bug)', async () => {
    await render(<TeacherChallengesScreen navigation={{ openDrawer: jest.fn() }} />);
    await waitFor(() => expect(screen.getAllByText('Pattern Challenge').length).toBeGreaterThan(0));
    expect(screen.getByText('Multiplication Mystery')).toBeTruthy();
    expect(screen.getAllByText('Real-World Application').length).toBeGreaterThan(0);
    expect(screen.getByText('Sharing Fairly')).toBeTruthy();
  });

  it('shows the empty state when no challenges exist for the selected grade', async () => {
    mockedService.fetchChallenges.mockResolvedValue([]);
    await render(<TeacherChallengesScreen navigation={{ openDrawer: jest.fn() }} />);
    await waitFor(() => expect(screen.getByText(/No challenges for/)).toBeTruthy());
  });

  it('assigns a challenge to a student end-to-end', async () => {
    mockedService.assignChallenge.mockResolvedValue({ ok: true });
    await render(<TeacherChallengesScreen navigation={{ openDrawer: jest.fn() }} />);
    await waitFor(() => expect(screen.getByText('Multiplication Mystery')).toBeTruthy());

    fireEvent.press(screen.getAllByText('Assign to Student')[0]);
    await waitFor(() => expect(screen.getByText('Select Student')).toBeTruthy());

    fireEvent.press(screen.getByText('Alice'));
    // Selecting a student swaps the search list for a "selected" chip -
    // wait for that state update to land before the Assign button (disabled
    // while no student is selected) can be pressed.
    await waitFor(() => expect(screen.queryByPlaceholderText('Search student by name...')).toBeNull());

    mockedService.fetchTeacherAssignments.mockResolvedValue([
      { challengeId: 'c1', studentId: 's1', status: 'assigned', dueDate: null },
    ]);
    const assignButtons = screen.getAllByText('Assign Challenge');
    fireEvent.press(assignButtons[assignButtons.length - 1]);

    await waitFor(() => expect(mockedService.assignChallenge).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: 'c1', studentId: 's1', teacherEmail: 'teacher@x.com',
    })));
    await waitFor(() => expect(screen.getByText(/assigned to Alice/)).toBeTruthy());
    fireEvent.press(screen.getByText('Done'));
    // Card no longer offers a plain "Assign" for a challenge the student already has
    await waitFor(() => expect(screen.getByText('Assigned to all students')).toBeTruthy());
  });

  it('shows assigned state instead of a fresh Assign button once every student has the challenge', async () => {
    mockedService.fetchTeacherAssignments.mockResolvedValue([
      { challengeId: 'c1', studentId: 's1', status: 'assigned', dueDate: null },
    ]);
    await render(<TeacherChallengesScreen navigation={{ openDrawer: jest.fn() }} />);
    await waitFor(() => expect(screen.getByText('Assigned to all students')).toBeTruthy());
    expect(screen.getByText('Assigned to 1 student')).toBeTruthy();
    // c2 is still unassigned
    expect(screen.getAllByText('Assign to Student')).toHaveLength(1);
  });
});
