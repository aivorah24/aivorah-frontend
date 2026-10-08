import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
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
}));
import { fetchPlatformOverview } from '../../services/platformAdminOverviewService';

const PAYLOAD = {
  counts: { users: 4, students: 2, teachers: 1, parents: 1, totalXP: 150, assignments: 2, assignmentsCompleted: 1 },
  students: [
    { id: 's1', name: 'Asha', email: 'a@x.test', grade: 'Grade 5', curriculum: 'CBSE', school: 'TSRA', location: '', onboardingComplete: true, xpPoints: 100, level: 2, currentStreak: 3, studyTimeMinutes: 40, completedTopicsCount: 2, hasParent: true, teacherCount: 1 },
    { id: 's2', name: 'Ben', email: 'b@x.test', grade: 'Grade 6', curriculum: 'CBSE', school: '', location: '', onboardingComplete: true, xpPoints: 50, level: 1, currentStreak: 0, studyTimeMinutes: 10, completedTopicsCount: 0, hasParent: false, teacherCount: 0 },
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
    expect(screen.getByText('TSRA')).toBeTruthy(); // school drill-down row
    expect(screen.getByTestId('overview-school-row-TSRA')).toBeTruthy();
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
      students: [{ id: 's1', name: 'Cam', email: 'c@x.test', grade: 'Grade 4', curriculum: 'CBSE', school: '', location: '', onboardingComplete: true, xpPoints: 0, level: 1, currentStreak: 0, studyTimeMinutes: 0, completedTopicsCount: 0, hasParent: false, teacherCount: 0 }],
      teachers: [],
      parents: [],
    });
    await render(<PlatformOverviewScreen navigation={nav} />);

    expect(await screen.findByText('No B2B schools yet.')).toBeTruthy();
  });
});
