import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react-native';
import PlatformOverviewScreen from '../../PlatformOverviewScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => { require('react').useEffect(() => { cb(); }, []); },
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#c90', accentRed: '#e33', accentCyan: '#5bf', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
jest.mock('../../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('../../services/platformAdminOverviewService', () => ({
  fetchPlatformOverview: jest.fn(),
  fetchChartsData: jest.fn(async () => ({
    roleCounts: { student: 2, teacher: 1, parent: 0 }, curriculumMap: {}, gradeMap: {},
    onboarding: { student: { done: 2, total: 2 }, teacher: { done: 1, total: 1 }, parent: { done: 0, total: 0 } },
    topXP: [], assignmentStats: { total: 0, completed: 0, pending: 0, byType: {} }, assignmentsLast7: [],
  })),
}));
import { fetchPlatformOverview } from '../../services/platformAdminOverviewService';

const PAYLOAD = {
  counts: { users: 4, students: 2, teachers: 1, parents: 1, totalXP: 150, assignments: 2, assignmentsCompleted: 1 },
  students: [
    { id: 's1', name: 'Asha', email: 'a@x.test', grade: 'Grade 5', curriculum: 'CBSE', school: 'TSRA', location: '', onboardingComplete: true, xpPoints: 100, level: 2, currentStreak: 3, studyTimeMinutes: 40, completedTopicsCount: 2, hasParent: true, teacherCount: 1, lastSeen: '2026-10-01T00:00:00Z' },
    { id: 's2', name: 'Ben', email: 'b@x.test', grade: 'Grade 6', curriculum: 'CBSE', school: '', location: '', onboardingComplete: true, xpPoints: 50, level: 1, currentStreak: 0, studyTimeMinutes: 10, completedTopicsCount: 0, hasParent: false, teacherCount: 0, lastSeen: null },
  ],
  teachers: [{ id: 't1', name: 'Ms Rao', email: 'rao@x.test', school: 'TSRA', location: '' }],
  parents: [],
};

const nav = { openDrawer: jest.fn() };

describe('PlatformOverviewScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renders platform counts, B2B/B2C split and the school drill-down table', async () => {
    (fetchPlatformOverview as jest.Mock).mockResolvedValueOnce(PAYLOAD);
    await render(<PlatformOverviewScreen navigation={nav} />);

    expect(await screen.findByText('4')).toBeTruthy(); // Total Users
    expect(screen.getByText('150')).toBeTruthy(); // Total XP Earned
    expect(screen.getByTestId('overview-school-row-TSRA')).toBeTruthy();
    expect(screen.getByTestId('overview-student-row-s1')).toBeTruthy();
    expect(screen.getByTestId('overview-teacher-row-t1')).toBeTruthy();
  });

  test('shows a retry option on a load error and does not render a stale table', async () => {
    (fetchPlatformOverview as jest.Mock).mockRejectedValueOnce(new Error('This account does not have platform admin access'));
    await render(<PlatformOverviewScreen navigation={nav} />);

    expect(await screen.findByText('This account does not have platform admin access')).toBeTruthy();
    expect(screen.queryByTestId('overview-school-row-TSRA')).toBeNull();
  });

  test('a platform with no B2B schools yet shows the empty state, not a crash', async () => {
    (fetchPlatformOverview as jest.Mock).mockResolvedValueOnce({
      counts: { users: 1, students: 1, teachers: 0, parents: 0, totalXP: 0, assignments: 0, assignmentsCompleted: 0 },
      students: [{ id: 's1', name: 'Cam', email: 'c@x.test', grade: 'Grade 4', curriculum: 'CBSE', school: '', location: '', onboardingComplete: true, xpPoints: 0, level: 1, currentStreak: 0, studyTimeMinutes: 0, completedTopicsCount: 0, hasParent: false, teacherCount: 0, lastSeen: null }],
      teachers: [],
      parents: [],
    });
    await render(<PlatformOverviewScreen navigation={nav} />);

    expect(await screen.findByText('No B2B schools yet.')).toBeTruthy();
  });

  test('clicking the XP column header sorts the students table by XP', async () => {
    (fetchPlatformOverview as jest.Mock).mockResolvedValueOnce(PAYLOAD);
    await render(<PlatformOverviewScreen navigation={nav} />);
    await screen.findByTestId('overview-student-row-s1');

    const rowOrder = () => screen.getAllByTestId(/^overview-student-row-/).map((row) => row.props.testID.replace('overview-student-row-', ''));
    // Fixture order is Asha(100xp) then Ben(50xp) — ascending XP puts Ben first.
    fireEvent.press(screen.getByTestId('overview-student-sort-xp'));
    await waitFor(() => expect(rowOrder()).toEqual(['s2', 's1']));

    // Pressing the same header again flips to descending.
    fireEvent.press(screen.getByTestId('overview-student-sort-xp'));
    await waitFor(() => expect(rowOrder()).toEqual(['s1', 's2']));
  });

  test('charts merge NCERT into CBSE and show grades 1–12 in order without Unknown', async () => {
    const { fetchChartsData } = require('../../services/platformAdminOverviewService');
    (fetchChartsData as jest.Mock).mockResolvedValueOnce({
      roleCounts: { student: 2, teacher: 1, parent: 0 },
      curriculumMap: { CBSE: 82, NCERT: 17, 'IB PYP': 39 },
      gradeMap: { '3': 2, 'Grade 3': 39, 'PYP 4': 4, 'Grade 4': 10, Unknown: 34, 'Grade 12': 1, 'Grade 10': 5 },
      onboarding: { student: { done: 0, total: 0 }, teacher: { done: 0, total: 0 }, parent: { done: 0, total: 0 } },
      topXP: [], assignmentStats: { total: 0, completed: 0, pending: 0, byType: {} }, assignmentsLast7: [],
    });
    (fetchPlatformOverview as jest.Mock).mockResolvedValueOnce(PAYLOAD);
    await render(<PlatformOverviewScreen navigation={nav} />);

    const cbse = within(await screen.findByTestId('dist-row-Curriculum Split-CBSE'));
    expect(cbse.getByText('99')).toBeTruthy();
    expect(screen.queryByTestId('dist-row-Curriculum Split-NCERT')).toBeNull();

    expect(screen.queryByTestId('dist-row-Grade Distribution-Unknown')).toBeNull();
    expect(screen.queryByTestId('dist-row-Grade Distribution-PYP 4')).toBeNull();
    expect(within(screen.getByTestId('dist-row-Grade Distribution-Grade 3')).getByText('41')).toBeTruthy();
    const order = screen.getAllByTestId(/^dist-row-Grade Distribution-/).map((r) => r.props.testID.replace('dist-row-Grade Distribution-', ''));
    expect(order).toEqual(['Grade 3', 'Grade 4', 'Grade 10', 'Grade 12']);
  });

  test('students table pages 10 at a time', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...PAYLOAD.students[0], id: `p${i + 1}`, name: `Kid ${String(i + 1).padStart(2, '0')}` }));
    (fetchPlatformOverview as jest.Mock).mockResolvedValueOnce({ ...PAYLOAD, students: many });
    await render(<PlatformOverviewScreen navigation={nav} />);
    await screen.findByTestId('overview-student-row-p1');

    expect(screen.queryByTestId('overview-student-row-p11')).toBeNull();
    expect(screen.getByTestId('overview-student-page-range').props.children.join('')).toBe('1–10 of 12');
    fireEvent.press(screen.getByTestId('overview-student-page-next'));
    await waitFor(() => expect(screen.getByTestId('overview-student-row-p11')).toBeTruthy());
    expect(screen.queryByTestId('overview-student-row-p1')).toBeNull();
  });

  test('searching the students table filters by name', async () => {
    (fetchPlatformOverview as jest.Mock).mockResolvedValueOnce(PAYLOAD);
    await render(<PlatformOverviewScreen navigation={nav} />);
    await screen.findByTestId('overview-student-row-s1');

    fireEvent.changeText(screen.getByTestId('overview-student-search'), 'ben');
    await waitFor(() => {
      expect(screen.queryByTestId('overview-student-row-s1')).toBeNull();
      expect(screen.getByTestId('overview-student-row-s2')).toBeTruthy();
    });
  });
});
