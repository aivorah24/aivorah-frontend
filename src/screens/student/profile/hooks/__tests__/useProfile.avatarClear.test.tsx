// Regression test for Bug #9 — second finding (2026-08-28): "the profile
// screen shows the new avatar right away, but the header top-right icon and
// the sidebar bottom-left avatar keep showing the OLD uploaded photo, even
// after a refresh."
//
// Root cause: handleSelectAvatar() called updateUser({ photoUrl: undefined })
// intending to clear the previously-uploaded photo. But JSON.stringify drops
// keys whose value is `undefined`, so the PATCH sent to
// /user/preferences never actually told the backend to clear photoUrl — the
// authoritative `users.photo_url` column (read back by every future
// /user/sync, which is what Header.tsx / Sidebar.tsx ultimately render) was
// left permanently stuck at the old photo. Header.tsx and Sidebar.tsx both
// prioritize photoUrl over avatarStyle when both are present, so the stale
// photo kept winning forever after any refresh.
//
// Fix: send an EXPLICIT `photoUrl: null` instead of `undefined` — `null`
// survives JSON.stringify, so the backend (aivorah-profile-service, fixed
// separately) can tell "clear it" apart from "field not touched" and write
// the clear through to users.photo_url.

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useProfile } from '../useProfile';

const mockUpdateUser = jest.fn();
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'student@example.com', avatarStyle: 'default', photoUrl: 'https://old-uploaded-photo.example/x.jpg' },
    updateUser: mockUpdateUser,
    logout: jest.fn(),
  }),
}));

jest.mock('../../services/profileService', () => ({
  saveProfileFields: jest.fn(),
  savePreferences: jest.fn().mockResolvedValue(undefined),
  uploadProfilePhoto: jest.fn(),
}));

function Harness() {
  const { handleSelectAvatar } = useProfile();
  return <TouchableOpacity testID="pick-champion" onPress={() => handleSelectAvatar('champion')}><Text>pick</Text></TouchableOpacity>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useProfile — handleSelectAvatar clears the old photo, not just locally', () => {
  test('sends an explicit photoUrl: null (not undefined) so the clear survives JSON.stringify to the server', async () => {
    await render(<Harness />);
    fireEvent.press(screen.getByTestId('pick-champion'));

    expect(mockUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({ avatarStyle: 'champion', photoUrl: null })
    );

    // The actual bug: JSON.stringify silently drops `undefined` keys, so a
    // PATCH body built from the old call would never even mention photoUrl.
    const sentFields = mockUpdateUser.mock.calls[0][0];
    const body = JSON.parse(JSON.stringify(sentFields));
    expect(body).toHaveProperty('photoUrl', null);
  });
});
