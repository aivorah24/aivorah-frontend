import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import SchoolAdminDashboardScreen from '../../SchoolAdminDashboardScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'SchoolAdminDashboard', name: 'SchoolAdminDashboard' }),
  useFocusEffect: (cb: any) => {
    require('react').useEffect(() => {
      cb();
    }, []);
  },
}));

let mockIsMobile = false;
jest.mock('../../../../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isMobile: mockIsMobile, isTablet: false, showPermanentSidebar: !mockIsMobile }),
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'admin@aivorah.test', name: 'Test Admin' },
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

const mockOverview = {
  school: { id: 's1', name: 'Test High School' },
  counts: { students: 100, teachers: 10, parents: 50, publishedAnnouncements: 2, scheduledAnnouncements: 0, draftAnnouncements: 0 },
  recentAnnouncements: []
};

const mockRequests = [
  { id: 'r1', user_email: 'new@test.com', name: 'New Student', isUnder14: true, parents: [], created_at: new Date().toISOString() }
];

function jsonRes(url: string) {
  if (url.includes('/overview')) {
    return Promise.resolve({ ok: true, json: async () => mockOverview });
  }
  if (url.includes('/access-requests')) {
    return Promise.resolve({ ok: true, json: async () => mockRequests });
  }
  return Promise.resolve({ ok: true, json: async () => [] });
}

beforeEach(() => {
  global.fetch = jest.fn((url: string) => jsonRes(url)) as any;
  mockIsMobile = false;
});

describe('SchoolAdminDashboardScreen', () => {
  test('renders loading then dashboard with real data', async () => {
    await render(<SchoolAdminDashboardScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getAllByText('Test High School').length).toBeGreaterThan(0));
    
    // Check stats are rendered
    expect(screen.getByText('100')).toBeTruthy(); // students
    expect(screen.getByText('10')).toBeTruthy(); // teachers
    expect(screen.getByText('50')).toBeTruthy(); // parents
    
    // Check requests are rendered
    expect(screen.getByText('New Student')).toBeTruthy();
  });

  test('pull to refresh fetches data again', async () => {
    await render(<SchoolAdminDashboardScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getAllByText('Test High School').length).toBeGreaterThan(0));

    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;

    // Simulate refresh
    const mainScroll = screen.getByTestId('dashboard-scroll');
    
    if (mainScroll) {
      await act(async () => { mainScroll.props.refreshControl.props.onRefresh(); });
    }

    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
