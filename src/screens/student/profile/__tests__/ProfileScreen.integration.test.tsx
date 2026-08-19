// Integration test for ProfileScreen — renders the real screen, opens the
// real Edit modal, types into real fields, presses the real Save button.
// AuthContext/ThemeContext mocked; fetch mocked so no real network call.

import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../ProfileScreen';

// ScreenLayout (used by ProfileScreen) calls useNavigation()/useRoute() —
// mocked directly since this test isn't exercising navigation itself.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Profile', name: 'Profile' }),
}));

function renderScreen() {
  return render(<ProfileScreen navigation={{}} />);
}

// Not exercised by this test — mocked out because the real firebase package
// ships ESM-only builds Jest can't parse, and ProfileScreen transitively
// pulls it in via OnboardingScreen -> OnboardingTeacherBoxes -> phoneOtpVerification.
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), deleteApp: jest.fn() }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  RecaptchaVerifier: jest.fn(),
  signInWithPhoneNumber: jest.fn(),
}));
jest.mock('../../../../config/firebase', () => ({}));

const mockUpdateUser = jest.fn();

jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'a@a.com', name: 'A Student', grade: 'Grade 4', curriculum: 'IB PYP', location: 'Hyderabad' },
    updateUser: mockUpdateUser,
    logout: jest.fn(),
  }),
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, isDark: true }),
}));

const mockRequestPermissions = jest.fn();
const mockLaunchLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...args: any[]) => mockRequestPermissions(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchLibrary(...args),
  MediaTypeOptions: { Images: 'Images' },
}));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('ProfileScreen', () => {
  test('hero shows the real name, grade and curriculum', async () => {
    await renderScreen();
    expect(screen.getByText('A Student')).toBeTruthy();
    expect(screen.getByText('Grade 4')).toBeTruthy();
    expect(screen.getByText('IB PYP')).toBeTruthy();
  });

  test('Edit opens the modal pre-filled with the current name', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByText('Edit'));
    expect(screen.getByDisplayValue('A Student')).toBeTruthy();
  });

  test('clearing the name and saving shows a validation error, never calls the API', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByText('Edit'));

    await user.clear(screen.getByDisplayValue('A Student'));
    await user.press(screen.getByText('Save Changes'));

    expect(await screen.findByText('Please enter your name.')).toBeTruthy();
    // Header fires its own analytics page_view call on mount — only the
    // profile-save call (PATCH /user/profile) must never have happened.
    const profileSaveCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes('/user/profile'));
    expect(profileSaveCalls).toHaveLength(0);
  });

  test('saving a valid name sends the whole form to PATCH /user/profile', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByText('Edit'));

    const nameInput = screen.getByDisplayValue('A Student');
    await user.clear(nameInput);
    await user.type(nameInput, 'A Renamed Student');
    await user.press(screen.getByText('Save Changes'));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/user/profile'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"name":"A Renamed Student"'),
      })
    );
    // Whole-form save — grade/curriculum/location still sent alongside the changed name.
    const profileSaveCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/user/profile'));
    const body = JSON.parse(profileSaveCall[1].body);
    expect(body).toMatchObject({ grade: 'Grade 4', curriculum: 'IB PYP', location: 'Hyderabad' });
  });

  describe('photo upload', () => {
    test('no permission granted -> shows an alert, never uploads', async () => {
      mockRequestPermissions.mockResolvedValueOnce({ status: 'denied' });
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
      const user = userEvent.setup();
      await renderScreen();

      await user.press(screen.getByTestId('avatarPickButton'));

      expect(alertSpy).toHaveBeenCalledWith('Permission needed', expect.stringContaining('Allow access'));
      const uploadCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes('/user/upload-photo'));
      expect(uploadCalls).toHaveLength(0);
      alertSpy.mockRestore();
    });

    test('cancelling the picker uploads nothing', async () => {
      mockRequestPermissions.mockResolvedValueOnce({ status: 'granted' });
      mockLaunchLibrary.mockResolvedValueOnce({ canceled: true });
      const user = userEvent.setup();
      await renderScreen();

      await user.press(screen.getByTestId('avatarPickButton'));

      const uploadCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes('/user/upload-photo'));
      expect(uploadCalls).toHaveLength(0);
    });

    test('picking a photo uploads it and saves the returned URL', async () => {
      mockRequestPermissions.mockResolvedValueOnce({ status: 'granted' });
      mockLaunchLibrary.mockResolvedValueOnce({
        canceled: false,
        assets: [{ base64: 'ZmFrZQ==', mimeType: 'image/png' }],
      });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ photoUrl: 'https://cloudinary.com/a.jpg' }) });
      const user = userEvent.setup();
      await renderScreen();

      await user.press(screen.getByTestId('avatarPickButton'));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/upload-photo'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"userEmail":"a@a.com"'),
        })
      );
      expect(mockUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ photoUrl: 'https://cloudinary.com/a.jpg' }));
    });

    test('an upload failure shows an alert', async () => {
      mockRequestPermissions.mockResolvedValueOnce({ status: 'granted' });
      mockLaunchLibrary.mockResolvedValueOnce({
        canceled: false,
        assets: [{ base64: 'ZmFrZQ==', mimeType: 'image/png' }],
      });
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
      const user = userEvent.setup();
      await renderScreen();
      // Set the rejection AFTER render — Header fires its own analytics fetch
      // on mount, which would otherwise consume a "once" rejection meant for
      // the photo upload call itself.
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));

      await user.press(screen.getByTestId('avatarPickButton'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Upload failed', expect.stringContaining('Could not upload photo'));
      });
      alertSpy.mockRestore();
    });
  });
});
