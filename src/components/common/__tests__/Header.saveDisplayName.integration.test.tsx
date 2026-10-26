// Regression test for Bug #2 (BUGS_AND_FIXES.md): editing the display name
// in "My Profile" shows the new name immediately, but a refresh shortly
// after reverts it back to the old name.
//
// Root cause: handleSaveName() in Header.tsx calls updateUser({name}) and
// closes the edit UI SYNCHRONOUSLY, before the PATCH to SERVER_URL/user/profile
// has even been sent (the fetch is the function's first await). A page
// refresh in that window cancels the in-flight request, so the server never
// receives the new name — but the UI already declared success. On refresh,
// AuthContext re-fetches the real (still-old) server value and the name
// reverts, with no error ever shown to the user.
//
// This test proves the defect directly: it holds the /user/profile PATCH
// pending (never resolves within the test), then asserts the UI has NOT
// already left "editing" state / shown the new name as saved — i.e. success
// must not be declared before the server confirms.

import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import Header from '../Header';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), openDrawer: jest.fn() }),
}));

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', accentYellow: '#fa0', accentGreen: '#0a0', accentRed: '#f00', textMain: '#fff',
    textMuted: '#888', textDim: '#666', borderColor: '#333', cardDark: '#111', cardHover: '#222',
  }, themeMode: 'dark', setThemeMode: jest.fn(), isDark: true }),
}));

const mockUpdateUser = jest.fn();
const mockUser = {
  email: 'student@a.com', name: 'Sai Mohan', role: 'student',
  grade: 'Grade 9', curriculum: 'CBSE',
};
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, updateUser: mockUpdateUser, logout: jest.fn() }),
}));

jest.mock('../../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: 0, notificationItems: [], latestNotif: null,
    clearUnread: jest.fn(), triggerPoll: jest.fn(),
  }),
}));

describe('Header — Edit display name (Bug #2 regression)', () => {
  beforeEach(() => {
    mockUpdateUser.mockClear();
  });

  test('does not declare the name saved until the server PATCH resolves', async () => {
    // The PATCH never resolves during this test — simulates a refresh
    // happening in the window before the server confirms the write.
    let resolvePatch: (v: any) => void = () => {};
    const pending = new Promise((resolve) => { resolvePatch = resolve; });
    global.fetch = jest.fn().mockReturnValue(pending);

    const user = userEvent.setup();
    await render(<Header title="Dashboard" />);

    await user.press(screen.getByTestId('header-profile-button'));
    await user.press(await screen.findByLabelText('Edit display name'));

    const input = await screen.findByPlaceholderText('Enter name...');
    await user.clear(input);
    await user.type(input, 'Sai');

    await user.press(screen.getByTestId('header-name-save-button'));

    // While the PATCH is still pending, the edit row must still be visible —
    // this is the actual defect: today it closes immediately, before the
    // fetch even resolves.
    expect(screen.queryByPlaceholderText('Enter name...')).toBeTruthy();

    resolvePatch({ ok: true, json: async () => ({}) });
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalled());
  });
});
