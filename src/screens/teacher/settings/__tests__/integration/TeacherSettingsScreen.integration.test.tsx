// Integration test for the composed TeacherSettingsScreen — proves the real
// screen wires useNotificationPreferences correctly end-to-end (JSX -> hook
// -> AsyncStorage -> notification bell poll), not just the isolated hook in
// isolation (see __tests__/unit/useNotificationPreferences.test.tsx for
// that). Other sections (account settings, teaching entries) are still inline in the legacy code pending their own extraction
// pass — heavy dependencies they pull in (Firebase auth, TeachingEntriesEditor)
// are stubbed here so this integration test stays scoped to the 4 concerns
// already extracted this pass (Notifications, Teacher Prefs, Photo, Logo).
import React from 'react';
import { View, Text } from 'react-native';
import { render, screen, userEvent, waitFor, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TeacherSettingsScreen from '../../TeacherSettingsScreen';

const mockTriggerPoll = jest.fn();

jest.mock('../../../../shared/account/services/googlePicker', () => ({ pickGoogleAccount: jest.fn() }));
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'teacher@school.com', name: 'Ms. Rao', roles: ['teacher'], school: 'Riverdale High', curriculum: 'IB PYP' },
    updateUser: jest.fn(),
    logout: jest.fn(),
    switchRole: jest.fn(),
  }),
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accentYellow: '#fa0', accentPurple: '#a0f', accentGreen: '#0fa', accentRed: '#f55',
      bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888', textDim: '#666', primary: '#fa0',
    },
    themeMode: 'dark',
    setThemeMode: jest.fn(),
  }),
}));

jest.mock('../../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    triggerPoll: mockTriggerPoll,
    clearUnreadAssignments: jest.fn(),
    clearUnreadChallenges: jest.fn(),
  }),
}));

jest.mock('../../../../../config/firebase', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({
  updatePassword: jest.fn(), EmailAuthProvider: { credential: jest.fn() }, GoogleAuthProvider: jest.fn(),
  reauthenticateWithCredential: jest.fn(), reauthenticateWithPopup: jest.fn(), signInWithPopup: jest.fn(), deleteUser: jest.fn(),
}));

jest.mock('../../../../../components/common/Header', () => {
  const { View: RNView } = require('react-native');
  return { __esModule: true, default: () => <RNView testID="header-stub" /> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => {
  const { View: RNView } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <RNView>{children}</RNView> };
});
jest.mock('../../../../../features/classes/components/ConnectSchoolBanner', () => {
  const { View: RNView } = require('react-native');
  return { __esModule: true, default: () => <RNView testID="connect-school-banner-stub" /> };
});
jest.mock('@legacy/school-admin/TeachingEntriesEditor', () => {
  const { View: RNView } = require('react-native');
  return { __esModule: true, default: () => <RNView testID="teaching-entries-editor-stub" />, emptyEntry: {} };
});

const mockFetchTeacherPreferences = jest.fn();
const mockFetchBrandingLogos = jest.fn();
jest.mock('../../services/settingsService', () => ({
  fetchTeacherPreferences: (...args: any[]) => mockFetchTeacherPreferences(...args),
  patchTeacherPreference: jest.fn().mockResolvedValue(undefined),
  fetchBrandingLogos: (...args: any[]) => mockFetchBrandingLogos(...args),
  uploadBrandingLogo: jest.fn(),
  uploadProfilePhoto: jest.fn(),
}));

function navProp() {
  return { navigate: jest.fn(), openDrawer: jest.fn() };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockFetchTeacherPreferences.mockResolvedValue(null);
  mockFetchBrandingLogos.mockResolvedValue({});
});

describe('TeacherSettingsScreen — Notifications integration', () => {
  test('toggling the real Parent Messages switch in the composed screen persists to AsyncStorage and triggers a poll', async () => {
    await render(<TeacherSettingsScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByTestId('teacher-settings-notifications-section')).toBeTruthy());
    const toggle = screen.getByTestId('teacher-settings-notif-toggle-teacherMessages');

    // RN's Switch exposes onValueChange, not onPress — userEvent.press()
    // (built for Touchable/onPress components) never fires it; the standard
    // RNTL pattern for a Switch is firing its valueChange event directly.
    fireEvent(toggle, 'valueChange', false);

    expect(mockTriggerPoll).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem('notifPrefs_teacher@school.com');
      expect(raw).toBeTruthy();
    });
    const saved = JSON.parse((await AsyncStorage.getItem('notifPrefs_teacher@school.com'))!);
    // Screen defaults Parent Messages to true, so the first real tap turns it off.
    expect(saved.teacherMessages).toBe(false);
  });

  test('Weekly Class Report and AI Class Insights render as real disabled "Soon" badges in the composed screen, not live toggles', async () => {
    await render(<TeacherSettingsScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByTestId('teacher-settings-notifications-section')).toBeTruthy());
    expect(screen.queryByTestId('teacher-settings-notif-toggle-weeklyReport')).toBeNull();
    expect(screen.queryByTestId('teacher-settings-notif-toggle-aiInsights')).toBeNull();
    expect(screen.getByText('Weekly Class Report')).toBeTruthy();
    expect(screen.getByText('AI Class Insights')).toBeTruthy();
  });
});

describe('TeacherSettingsScreen — Parent profile removed', () => {
  test('no Parent Profile row, Add button or onboarding modal', async () => {
    await render(<TeacherSettingsScreen navigation={navProp()} />);
    await waitFor(() => expect(screen.getByTestId('teacher-settings-notifications-section')).toBeTruthy());
    expect(screen.queryByText('Parent Profile')).toBeNull();
    expect(screen.queryByText('Add Parent Profile')).toBeNull();
    expect(screen.queryByText(/Add a parent profile/i)).toBeNull();
    expect(screen.queryByText('Add')).toBeNull();
  });
});
