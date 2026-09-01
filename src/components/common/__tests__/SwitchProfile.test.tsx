// SwitchProfile is the single shared implementation of the "Switch Profile"
// feature (dual-role Teacher/Parent pills, and the single-role "Also a
// parent?" hint), used by both Sidebar.tsx (web) and DrawerContent.tsx
// (mobile drawer). Before this refactor, both consumers had their own
// byte-for-byte duplicate inline copies of this logic — these tests cover
// the one real implementation both now share.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SwitchProfile } from '../SwitchProfile';

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', accentYellow: '#fa0', accentGreen: '#0a0', accentRed: '#f00', textMain: '#fff',
    textMuted: '#888', textDim: '#666', borderColor: '#333', cardDark: '#111', cardHover: '#222',
  }, themeMode: 'dark', setThemeMode: jest.fn(), isDark: true }),
}));

const mockSwitchRole = jest.fn();
const mockBeginAddParentProfile = jest.fn();
let mockUser: any = { email: 'teacher@x.com', name: 'E2E Teacher', role: 'teacher', roles: ['teacher'] };
let mockPendingReturnRole: string | null = null;

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, switchRole: mockSwitchRole, beginAddParentProfile: mockBeginAddParentProfile }),
  getPendingReturnRole: () => mockPendingReturnRole,
}));

describe('SwitchProfile', () => {
  const onNavigate = jest.fn();

  beforeEach(() => {
    mockSwitchRole.mockClear();
    mockBeginAddParentProfile.mockClear();
    onNavigate.mockClear();
    mockPendingReturnRole = null;
  });

  test('collapsed renders nothing, regardless of role state', async () => {
    mockUser = { email: 'teacher@x.com', role: 'teacher', roles: ['teacher', 'parent'] };
    await render(<SwitchProfile collapsed onNavigate={onNavigate} />);
    expect(screen.queryByTestId('switch-profile-container')).toBeNull();
    expect(screen.queryByTestId('sidebar-add-parent-hint')).toBeNull();
  });

  test('single-role teacher sees the "Also a parent?" hint, not the pills', async () => {
    mockUser = { email: 'teacher@x.com', role: 'teacher', roles: ['teacher'] };
    await render(<SwitchProfile onNavigate={onNavigate} />);
    expect(screen.getByTestId('sidebar-add-parent-hint')).toBeTruthy();
    expect(screen.getByText('Also a parent?')).toBeTruthy();
    expect(screen.queryByTestId('switch-profile-container')).toBeNull();
  });

  test('single-role non-teacher (e.g. student, parent) sees neither the hint nor the pills', async () => {
    mockUser = { email: 'student@x.com', role: 'student', roles: ['student'] };
    await render(<SwitchProfile onNavigate={onNavigate} />);
    expect(screen.queryByTestId('sidebar-add-parent-hint')).toBeNull();
    expect(screen.queryByTestId('switch-profile-container')).toBeNull();
  });

  test('tapping the hint starts the in-memory add-parent flow, not a real mutation', async () => {
    mockUser = { email: 'teacher@x.com', role: 'teacher', roles: ['teacher'] };
    await render(<SwitchProfile onNavigate={onNavigate} />);
    fireEvent.press(screen.getByTestId('sidebar-add-parent-hint'));
    expect(mockBeginAddParentProfile).toHaveBeenCalledTimes(1);
    expect(mockSwitchRole).not.toHaveBeenCalled();
  });

  test('dual-role user (real roles array) sees both pills, not the hint', async () => {
    mockUser = { email: 'teacher@x.com', role: 'teacher', roles: ['teacher', 'parent'] };
    await render(<SwitchProfile onNavigate={onNavigate} />);
    expect(screen.getByTestId('sidebar-role-pill-teacher')).toBeTruthy();
    expect(screen.getByTestId('sidebar-role-pill-parent')).toBeTruthy();
    expect(screen.queryByTestId('sidebar-add-parent-hint')).toBeNull();
  });

  test('mid-onboarding pendingReturn also counts as dual-role (before roles[] persists)', async () => {
    // beginAddParentProfile() flips the role to 'parent' in memory only,
    // before any backend write — roles[] is still just ['teacher'] at this
    // point, so isDualRole must fall back to the pendingReturn signal.
    mockUser = { email: 'teacher@x.com', role: 'parent', roles: ['teacher'] };
    mockPendingReturnRole = 'teacher';
    await render(<SwitchProfile onNavigate={onNavigate} />);
    expect(screen.getByTestId('sidebar-role-pill-teacher')).toBeTruthy();
    expect(screen.getByTestId('sidebar-role-pill-parent')).toBeTruthy();
  });

  test('clicking a role pill switches role and navigates to that role\'s dashboard', async () => {
    jest.useFakeTimers();
    mockUser = { email: 'teacher@x.com', role: 'teacher', roles: ['teacher', 'parent'] };
    await render(<SwitchProfile onNavigate={onNavigate} />);
    fireEvent.press(screen.getByTestId('sidebar-role-pill-parent'));
    expect(mockSwitchRole).toHaveBeenCalledWith('parent');
    jest.runAllTimers();
    expect(onNavigate).toHaveBeenCalledWith('ParentDashboard');
    jest.useRealTimers();
  });

  test('clicking the active role\'s own pill still switches (idempotent) and navigates to Teacher dashboard', async () => {
    jest.useFakeTimers();
    mockUser = { email: 'teacher@x.com', role: 'teacher', roles: ['teacher', 'parent'] };
    await render(<SwitchProfile onNavigate={onNavigate} />);
    fireEvent.press(screen.getByTestId('sidebar-role-pill-teacher'));
    expect(mockSwitchRole).toHaveBeenCalledWith('teacher');
    jest.runAllTimers();
    expect(onNavigate).toHaveBeenCalledWith('TeacherDashboard');
    jest.useRealTimers();
  });

  test('navigation errors from onNavigate are swallowed, not thrown', async () => {
    jest.useFakeTimers();
    mockUser = { email: 'teacher@x.com', role: 'teacher', roles: ['teacher', 'parent'] };
    const throwingNavigate = jest.fn(() => { throw new Error('navigation not ready'); });
    await render(<SwitchProfile onNavigate={throwingNavigate} />);
    fireEvent.press(screen.getByTestId('sidebar-role-pill-parent'));
    expect(() => jest.runAllTimers()).not.toThrow();
    jest.useRealTimers();
  });

  test('testIDPrefix disambiguates Sidebar.tsx from DrawerContent.tsx — both mount at once', async () => {
    // Sidebar.tsx and DrawerContent.tsx render SwitchProfile simultaneously
    // (React Navigation's Drawer keeps its content mounted off-screen).
    // Without a distinct prefix per consumer, this testID would exist twice
    // in the DOM at once — a real regression hit and fixed this session.
    mockUser = { email: 'teacher@x.com', role: 'teacher', roles: ['teacher'] };
    await render(<SwitchProfile testIDPrefix="drawer" onNavigate={onNavigate} />);
    expect(screen.getByTestId('drawer-add-parent-hint')).toBeTruthy();
    expect(screen.queryByTestId('sidebar-add-parent-hint')).toBeNull();
  });

  test('no user at all renders nothing', async () => {
    mockUser = null;
    await render(<SwitchProfile onNavigate={onNavigate} />);
    expect(screen.queryByTestId('sidebar-add-parent-hint')).toBeNull();
    expect(screen.queryByTestId('switch-profile-container')).toBeNull();
  });
});
