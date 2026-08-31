import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import ParentProfileScreen from '../../ParentProfileScreen';
const mockShowNotification = jest.fn();

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@example.com', name: 'Jane Doe', uid: '123' }, role: 'parent' })
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', colors: { bgDark: '#000', cardDark: '#111', textMain: '#fff', textMuted: '#aaa', accentYellow: '#ff0' }, spacing: { sm: 4, md: 8, lg: 16 }, radius: { md: 8, lg: 16 } })
}));
jest.mock('../../../../../context/NotificationContext', () => ({
  useNotification: () => ({ 
    showNotification: mockShowNotification, 
    notifications: [], 
    notificationItems: [],
    unreadCount: 0,
    unreadAssignments: 0,
    unreadChallenges: 0,
    unreadEvents: 0,
    unreadJoinRequests: 0
  })
}));
import * as parentProfileService from '../../services/parentProfileService';
import { getAuth } from 'firebase/auth';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: jest.fn((cb) => cb()),
  useRoute: () => ({ name: 'ParentProfile' }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = require('react');
  return Object.setPrototypeOf({
    Modal: ({ children }: any) => React.createElement(RN.View, null, children),
    KeyboardAvoidingView: ({ children }: any) => React.createElement(RN.View, null, children)
  }, RN);
});

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: { uid: '123' } })),
  updatePassword: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  reauthenticateWithCredential: jest.fn(),
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

jest.mock('../../services/parentProfileService', () => ({
  syncUser: jest.fn(),
  saveProfile: jest.fn(),
  fetchChildrenActivity: jest.fn(),
}));

const renderScreen = async () => {
  return await render(<ParentProfileScreen navigation={{ navigate: mockNavigate, openDrawer: jest.fn() }} />);
};

describe('ParentProfileScreen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parentProfileService.syncUser as jest.Mock).mockResolvedValue({ phone: '12345', location: 'City A' });
    (parentProfileService.fetchChildrenActivity as jest.Mock).mockResolvedValue({
      children: [{ id: 'c1' }, { id: 'c2' }],
      weeklyActivity: [10, 20, 30, 0, 0, 0, 0],
    });
  });

  it('renders profile data and activity correctly', async () => {
    await renderScreen();

    // The screen loads async data, wait for it
    await waitFor(() => {
      expect(parentProfileService.syncUser).toHaveBeenCalledWith('parent@example.com');
      expect(parentProfileService.fetchChildrenActivity).toHaveBeenCalledWith('parent@example.com');
    });

    // Verify info is displayed
    // "Jane Doe" legitimately renders twice (ProfileHeroCard's welcome text
    // AND ProfileInfoCard's name row) - just confirm it's present, don't
    // require a unique match.
    await waitFor(() => expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getAllByText('parent@example.com').length).toBeGreaterThan(0));
    expect(screen.getAllByText('12345').length).toBeGreaterThan(0);
    expect(screen.getAllByText('City A').length).toBeGreaterThan(0);
    expect(await screen.findByText('2 kids')).toBeTruthy();
    // 10+20+30 = 60 mins; formatStudyTime renders whole hours without a minutes suffix
    expect(await screen.findByText('1h')).toBeTruthy();
  });

  it('allows opening and saving edit profile modal', async () => {
    (parentProfileService.saveProfile as jest.Mock).mockResolvedValue({ ok: true });
    await renderScreen();

    await waitFor(() => expect(parentProfileService.syncUser).toHaveBeenCalled());

    // "Edit Profile" appears twice: ProfileHeroCard's trigger AND
    // EditProfileModal's own title (modal children mount even while closed) -
    // the trigger renders first, so [0]. Same pattern as "Change Password" below.
    await waitFor(() => expect(screen.getAllByText('Edit Profile').length).toBeGreaterThan(0));
    await act(async () => {
      fireEvent.press(screen.getAllByText('Edit Profile')[0]);
    });

    // Confirm the modal genuinely opened (editVisible=true) before proceeding.
    await waitFor(() => expect(screen.getByPlaceholderText('Your full name')).toBeTruthy());

    // Change value
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('e.g. Hyderabad'), 'City B');
    });

    // Save
    await act(async () => {
      fireEvent.press(screen.getByText('Save Changes'));
    });

    await waitFor(() => {
      expect(parentProfileService.saveProfile).toHaveBeenCalledWith({
        email: 'parent@example.com',
        name: 'Jane Doe',
        location: 'City B',
        phone: '12345',
        role: 'parent'
      });
    });
    // saveEdit() (ParentProfileScreen.tsx) does not call showNotification on
    // success - it just closes the modal. No notification assertion here.
  });

  it('navigates to settings for Security tiles', async () => {
    await renderScreen();
    await waitFor(() => expect(parentProfileService.syncUser).toHaveBeenCalled());

    fireEvent.press(await screen.findByText('Privacy & Security'));
    expect(mockNavigate).toHaveBeenCalledWith('ParentSettings');
  });

  it('handles change password flow', async () => {
    await renderScreen();
    await waitFor(() => expect(parentProfileService.syncUser).toHaveBeenCalled());

    // "Change Password" appears twice: the SecurityAccountCard trigger AND
    // ChangePasswordModal's own title (the modal's children mount even while
    // closed in this RNTL/RN-Web setup) - the trigger renders first, so [0].
    await waitFor(() => expect(screen.getAllByText('Change Password').length).toBeGreaterThan(0));
    fireEvent.press(screen.getAllByText('Change Password')[0]);

    // Fill in the form
    fireEvent.changeText(await screen.findByPlaceholderText('Enter current password'), 'old123');
    fireEvent.changeText(await screen.findByPlaceholderText('At least 6 characters'), 'new123');
    fireEvent.changeText(await screen.findByPlaceholderText('Re-enter new password'), 'new123');

    // Submit
    fireEvent.press(await screen.findByText('Update Password'));

    await waitFor(() => {
      expect(getAuth).toHaveBeenCalled();
    });
    // Should show success state in the modal
    expect(await screen.findByText('Password Updated!')).toBeTruthy();
  });
});
