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

  describe('Leaderboard tab filters', () => {
    const LB = [
      { rank: 1, id: 'a', name: 'Aanya Rao', grade: 'Grade 3', score: 90, level: 2, streak: 3, topics: 1 },
      { rank: 2, id: 'b', name: 'Bilal Khan', grade: 'Grade 4', score: 60, level: 1, streak: 1, topics: 0 },
      { rank: 3, id: 'c', name: 'Chitra Iyer', grade: 'Grade 3', score: 40, level: 1, streak: 0, topics: 0 },
      { rank: 4, id: 'd', name: 'Dev Mehta', grade: 'Grade 4', score: 0, level: 1, streak: 0, topics: 0 },
    ];
    const lastFilters = () => mockedService.fetchClassLeaderboard.mock.calls.at(-1)?.[1];

    beforeEach(() => {
      mockedService.fetchTeacherPreferences.mockResolvedValue({ teaches: [{ grade: 'Grade 3' }, { grade: 'Grade 4' }] });
      mockedService.fetchClassLeaderboard.mockResolvedValue(LB);
    });

    async function openLeaderboard() {
      await render(<TeacherChallengesScreen navigation={{ openDrawer: jest.fn() }} />);
      fireEvent.press(screen.getByText('Leaderboard'));
      await waitFor(() => expect(screen.getByText('Top Performers This Week')).toBeTruthy());
      await waitFor(() => expect(screen.getByText('Dev Mehta')).toBeTruthy());
    }

    it('opens on This Week for every grade the teacher teaches', async () => {
      await openLeaderboard();
      expect(mockedService.fetchClassLeaderboard).toHaveBeenCalledWith('teacher@x.com', { period: 'week', date: '', classGrade: '' });
      expect(screen.getByText('XP Earned This Week')).toBeTruthy();
      expect(screen.getByText('Days Left This Week')).toBeTruthy();
    });

    it('Today / This Month refetch the podium and the table for that period', async () => {
      await openLeaderboard();

      fireEvent.press(screen.getByText('Today'));
      await waitFor(() => expect(lastFilters()).toEqual({ period: 'today', date: '', classGrade: '' }));
      expect(screen.getByText('Top Performers Today')).toBeTruthy();
      expect(screen.getByText('XP Earned Today')).toBeTruthy();
      // 3 of the 4 students earned XP
      await waitFor(() => expect(screen.getByText('Students Who Earned XP')).toBeTruthy());

      fireEvent.press(screen.getByText('This Month'));
      await waitFor(() => expect(lastFilters()).toEqual({ period: 'month', date: '', classGrade: '' }));
      expect(screen.getByText('Top Performers This Month')).toBeTruthy();
      expect(screen.getByText('Days Left This Month')).toBeTruthy();
    });

    it('Custom Date shows a calendar and loads the chosen day', async () => {
      await openLeaderboard();

      fireEvent.press(screen.getByText('Custom Date'));
      await waitFor(() => expect(lastFilters()?.period).toBe('custom'));
      const todayKey = lastFilters()?.date as string;
      expect(todayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/); // starts on today

      // open the calendar and pick the 1st of the shown month
      fireEvent.press(screen.getByText(/^(Su|Mo|Tu|We|Th|Fr|Sa), /));
      const firstOfMonth = `${todayKey.slice(0, 8)}01`;
      fireEvent.press(await screen.findByLabelText(firstOfMonth));
      await waitFor(() => expect(lastFilters()).toEqual({ period: 'custom', date: firstOfMonth, classGrade: '' }));
      const [y, m] = firstOfMonth.split('-').map(Number);
      const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
      expect(screen.getByText(`Top Performers on 1 ${mon} ${y}`)).toBeTruthy();
    });

    it('a grade chip narrows both the podium and the table to that grade; By XP shows all grades again', async () => {
      await openLeaderboard();

      fireEvent.press(screen.getByRole('radio', { name: 'Grade 4' }));
      await waitFor(() => expect(lastFilters()).toEqual({ period: 'week', date: '', classGrade: 'Grade 4' }));
      expect(screen.getByText('Students in Grade 4')).toBeTruthy();

      fireEvent.press(screen.getByRole('radio', { name: 'By XP' }));
      await waitFor(() => expect(lastFilters()).toEqual({ period: 'week', date: '', classGrade: '' }));
    });

    it('a grade with no students keeps the filters visible with an empty message', async () => {
      await openLeaderboard();
      mockedService.fetchClassLeaderboard.mockResolvedValue([]);

      fireEvent.press(screen.getByRole('radio', { name: 'Grade 4' }));
      await waitFor(() => expect(screen.getAllByText('No students in Grade 4 yet.').length).toBeGreaterThan(0));
      expect(screen.getByText('Today')).toBeTruthy();
      expect(screen.getByText('By XP')).toBeTruthy();
    });

    it('fewer than 3 students still shows the podium with who there is', async () => {
      mockedService.fetchClassLeaderboard.mockResolvedValue(LB.slice(0, 2));
      await render(<TeacherChallengesScreen navigation={{ openDrawer: jest.fn() }} />);
      fireEvent.press(screen.getByText('Leaderboard'));
      await waitFor(() => expect(screen.getByText('Aanya Rao')).toBeTruthy());
      expect(screen.getByText('Bilal Khan')).toBeTruthy();
      expect(screen.getByText('All class members are on the podium above.')).toBeTruthy();
    });
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
