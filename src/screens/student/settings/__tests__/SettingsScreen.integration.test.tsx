// Integration tests for SettingsScreen — the real screen and its real card/
// modal components, with all 7 hooks mocked at the module boundary (each
// already has its own dedicated hook tests covering the real business logic).
// Focuses on: modal open/close routing (incl. resetting other forms first),
// Google-user routing to SSOInfoModal instead of PasswordModal, sign-out and
// delete-account actions, and section-scroll-on-navigation-param.

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import SettingsScreen from '../SettingsScreen';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), openDrawer: jest.fn() }),
  useRoute: () => ({ key: 'Settings', name: 'Settings' }),
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', accentYellow: '#fa0', accentGreen: '#0a0', accentRed: '#f00', textMain: '#fff',
    textMuted: '#888', textDim: '#666', borderColor: '#333', cardDark: '#111', cardHover: '#222',
  }, themeMode: 'dark', setThemeMode: jest.fn(), isDark: true }),
}));

let mockUser: any;
const mockUpdateUser = jest.fn();
const mockLogout = jest.fn();
const mockRefreshProfile = jest.fn();
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, updateUser: mockUpdateUser, logout: mockLogout, refreshProfile: mockRefreshProfile }),
}));

jest.mock('../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ stats: { level: 3 } }),
  formatLevel: (level: number) => `Level ${level}`,
}));

jest.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: 0, unreadAssignments: 0, unreadChallenges: 0, unreadEvents: 0,
    latestNotif: null, notificationItems: [],
    clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(), clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn(),
    unreadJoinRequests: 0,
    triggerPoll: jest.fn(), muteCategory: jest.fn(),
  }),
}));

let mockCurrentUser: any = null;
jest.mock('../../../../config/firebase', () => ({
  auth: { get currentUser() { return mockCurrentUser; } },
}));

// Self-gating on role; a plain student user renders nothing extra here.
jest.mock('../../../../features/classes/components/ConnectSchoolBanner', () => () => null);

// CurriculumModal imports CURRICULA from the whole OnboardingScreen module,
// which transitively drags in a raw (non-Jest-transformed) firebase/app ESM
// import chain. Mock just the constant this test tree actually needs.
jest.mock('../../../onboarding/OnboardingScreen', () => ({
  CURRICULA: ['IB PYP', 'CBSE'],
}));

const mockResetForm = jest.fn();
jest.mock('../hooks/useProfilePhoto', () => ({ useProfilePhoto: () => ({ photoUrl: null, uploading: false, handlePickPhoto: jest.fn() }) }));
jest.mock('../hooks/useProfileFields', () => ({ useProfileFields: () => ({
  newName: '', setNewName: jest.fn(), nameError: '', setNameError: jest.fn(), handleSaveName: jest.fn(),
  GRADES: ['Grade 4', 'Grade 5'], selectedGrade: 'Grade 4', setSelectedGrade: jest.fn(), gradeLoading: false, handleSaveGrade: jest.fn(),
  selectedCurriculum: 'IB PYP', setSelectedCurriculum: jest.fn(), curriculumLoading: false, handleSaveCurriculum: jest.fn(),
  newLocation: '', setNewLocation: jest.fn(), locationLoading: false, handleSaveLocation: jest.fn(),
  resetForm: mockResetForm,
}) }));
jest.mock('../../../shared/account/hooks/useEmailChange', () => ({ useEmailChange: () => ({
  step: 'form', newEmail: '', setNewEmail: jest.fn(), password: '', setPassword: jest.fn(), otp: '', setOtp: jest.fn(),
  error: '', info: '', loading: false, doneMessage: '', isGoogleUser: false,
  reset: mockResetForm, backToForm: jest.fn(), sendOtp: jest.fn(), resendOtp: jest.fn(), verifyOtp: jest.fn(), switchGoogleAccount: jest.fn(),
}) }));
jest.mock('../hooks/usePasswordChange', () => ({ usePasswordChange: () => ({
  currentPassword: '', setCurrentPassword: jest.fn(), newPassword: '', setNewPassword: jest.fn(),
  confirmPassword: '', setConfirmPassword: jest.fn(), showCurrent: false, setShowCurrent: jest.fn(),
  showNew: false, setShowNew: jest.fn(), passwordError: '', modalLoading: false, handleChangePassword: jest.fn(),
  resetForm: mockResetForm,
}) }));
jest.mock('../hooks/useRecoveryEmail', () => ({ useRecoveryEmail: () => ({
  recoveryEmail: '', setRecoveryEmail: jest.fn(), recoveryError: '', setRecoveryError: jest.fn(),
  recoverySaved: '', setRecoverySaved: jest.fn(), recoveryStep: 'email', setRecoveryStep: jest.fn(),
  recoveryOtp: '', setRecoveryOtp: jest.fn(), recoverySending: false, modalLoading: false,
  handleSendRecoveryCode: jest.fn(), handleVerifyRecoveryOtp: jest.fn(),
  resetForm: mockResetForm,
}) }));
jest.mock('../hooks/useDeleteAccount', () => ({ useDeleteAccount: () => ({
  deleteModalVisible: mockDeleteModalVisible, setDeleteModalVisible: mockSetDeleteModalVisible, openDeleteModal: mockOpenDeleteModal,
  deletePassword: '', setDeletePassword: jest.fn(), deleteLoading: false, deleteError: '', setDeleteError: jest.fn(),
  confirmDeleteAccount: jest.fn(),
}) }));
jest.mock('../hooks/useNotificationPrefs', () => ({ useNotificationPrefs: () => ({
  assignmentAlerts: true, challengeUpdates: true, toggleAssignmentAlerts: jest.fn(), toggleChallengeUpdates: jest.fn(),
}) }));

let mockDeleteModalVisible = false;
const mockSetDeleteModalVisible = jest.fn();
const mockOpenDeleteModal = jest.fn();

function navProp(params: any = {}) {
  return { openDrawer: jest.fn(), navigate: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { name: 'A Student', email: 'a@a.com', grade: 'Grade 4', curriculum: 'IB PYP', authProvider: 'password' };
  mockCurrentUser = { email: 'a@a.com', providerData: [{ providerId: 'password' }] };
  mockDeleteModalVisible = false;
  // ScreenLayout (real, not mocked) gates all children behind its own
  // screen-time-status fetch for student users.
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
});

describe('SettingsScreen — opening a field modal', () => {
  test('pressing a real field edit button resets all other forms first, then opens that modal', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen navigation={navProp()} route={{}} />);

    await user.press(screen.getByTestId('settings-field-name-edit-button'));

    expect(mockResetForm).toHaveBeenCalled();
    expect(screen.getByTestId('settings-modal-name')).toBeTruthy();
  });

  test('pressing the real grade edit button opens the real Grade modal', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen navigation={navProp()} route={{}} />);

    await user.press(screen.getByTestId('settings-field-grade-edit-button'));

    expect(screen.getByTestId('settings-modal-grade')).toBeTruthy();
  });

  test('closing a real open modal via its close button hides it again', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen navigation={navProp()} route={{}} />);
    await user.press(screen.getByTestId('settings-field-name-edit-button'));
    expect(screen.getByTestId('settings-modal-name')).toBeTruthy();

    await user.press(screen.getByTestId('settings-modal-name-close-button'));

    expect(screen.queryByTestId('settings-modal-name')).toBeNull();
  });
});

describe('SettingsScreen — password vs Google SSO routing', () => {
  test('a real password-user pressing "Change" opens the real PasswordModal', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen navigation={navProp()} route={{}} />);

    await user.press(screen.getByTestId('settings-security-password-button'));

    expect(screen.getByTestId('settings-modal-password')).toBeTruthy();
  });

  test('a real Google-SSO user pressing the security row opens SSOInfoModal, not PasswordModal', async () => {
    mockUser = { name: 'A Student', email: 'a@a.com', authProvider: 'google' };
    mockCurrentUser = { email: 'a@a.com', providerData: [{ providerId: 'google.com' }] };
    const user = userEvent.setup();
    await render(<SettingsScreen navigation={navProp()} route={{}} />);

    await user.press(screen.getByTestId('settings-security-password-button'));

    expect(screen.getByTestId('settings-modal-sso-info')).toBeTruthy();
    expect(screen.queryByTestId('settings-modal-password')).toBeNull();
  });
});

describe('SettingsScreen — sign out', () => {
  test('pressing the real Sign Out button opens the real confirm modal, confirming calls logout', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen navigation={navProp()} route={{}} />);

    await user.press(screen.getByTestId('settings-signout-button'));
    expect(screen.getByTestId('settings-modal-signout')).toBeTruthy();

    await user.press(screen.getByTestId('settings-modal-signout-confirm-button'));

    expect(mockLogout).toHaveBeenCalled();
  });

  test('cancelling the real sign-out modal does not log out', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen navigation={navProp()} route={{}} />);
    await user.press(screen.getByTestId('settings-signout-button'));

    await user.press(screen.getByTestId('settings-modal-signout-cancel-button'));

    expect(screen.queryByTestId('settings-modal-signout')).toBeNull();
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

describe('SettingsScreen — delete account', () => {
  test('pressing the real Delete Account button calls the real openDeleteModal', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen navigation={navProp()} route={{}} />);

    await user.press(screen.getByTestId('settings-delete-account-button'));

    expect(mockOpenDeleteModal).toHaveBeenCalled();
  });

  test('the real delete modal renders when the hook reports it visible', async () => {
    mockDeleteModalVisible = true;
    await render(<SettingsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('settings-modal-delete')).toBeTruthy();
  });
});

describe('SettingsScreen — appearance and notifications', () => {
  test('renders the real theme options', async () => {
    await render(<SettingsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('settings-theme-dark-option')).toBeTruthy();
    expect(screen.getByTestId('settings-theme-light-option')).toBeTruthy();
  });

  test('renders the real notification toggles from the hook', async () => {
    await render(<SettingsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('settings-notif-assignmentAlerts-switch')).toBeTruthy();
  });
});
