import React from 'react';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react-native';
import AdminUsersScreen, { lastActiveLabel } from '../../AdminUsersScreen';

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, colors: { primary: '#5E7566', accentGreen: '#5E7566', accentYellow: '#c90', accentRed: '#e33', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
jest.mock('../../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('../../../shared/useAdminSchools', () => ({
  useAdminSchools: () => ({ schools: [{ id: 's1', name: 'TSRA', curriculum: 'IB' }, { id: 's2', name: 'Green Valley', curriculum: 'CBSE' }], loading: false, error: '', reload: jest.fn(), placeholder: 'Select' }),
}));
jest.mock('../../services/usersService', () => ({
  fetchAdminUsers: jest.fn(), updateAdminUser: jest.fn(), blockAdminUser: jest.fn(),
  unblockAdminUser: jest.fn(), bulkSetBlocked: jest.fn(), sendPasswordReset: jest.fn(),
  createAdminUser: jest.fn(), fetchSchoolStructure: jest.fn(async () => []),
}));
import * as svc from '../../services/usersService';

const mockSvc = svc as jest.Mocked<typeof svc>;
const NOW = new Date().toISOString();
const USERS = [
  { id: 'u1', name: 'Asha Rao', email: 'asha@x.com', role: 'student', school: 'TSRA', school_id: 's1', status: 'active', last_active_at: NOW, created_at: NOW, isPlatformAdmin: false },
  { id: 'u2', name: 'Ben Kumar', email: 'ben@x.com', role: 'teacher', school: null, school_id: null, status: 'blocked', last_active_at: null, created_at: NOW, isPlatformAdmin: false },
  { id: 'u3', name: 'Root', email: 'admin@aivorah.ai', role: 'parent', school: null, school_id: null, status: 'active', last_active_at: null, created_at: NOW, isPlatformAdmin: true },
] as any[];

async function pickOption(testID: string, value: string) {
  await fireEvent.press(screen.getByTestId(testID));
  await fireEvent.press(await screen.findByTestId(`${testID}-option-${value}`));
}

describe('AdminUsersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSvc.fetchAdminUsers.mockResolvedValue({ users: USERS, total: 3, pageSize: 50 } as any);
  });

  test('renders rows with role, school, status; platform admin has no Block button', async () => {
    await render(<AdminUsersScreen navigation={{}} />);
    const asha = within(await screen.findByTestId('users-row-u1'));
    expect(asha.getByText('Student')).toBeTruthy();
    expect(asha.getByText('TSRA')).toBeTruthy();
    expect(asha.getByText('Active')).toBeTruthy();
    const ben = within(screen.getByTestId('users-row-u2'));
    expect(ben.getByText('Blocked')).toBeTruthy();
    expect(ben.getByText('Direct (B2C)')).toBeTruthy();
    expect(ben.getByText('Unblock')).toBeTruthy();
    expect(screen.queryByTestId('users-block-u3')).toBeNull();
    expect(screen.getByText('Users (3)')).toBeTruthy();
    expect(mockSvc.fetchAdminUsers).toHaveBeenCalledTimes(1);
  });

  test('role and status filters reload from page 1', async () => {
    await render(<AdminUsersScreen navigation={{}} />);
    await screen.findByTestId('users-row-u1');
    await pickOption('users-filter-role', 'teacher');
    await waitFor(() => expect(mockSvc.fetchAdminUsers).toHaveBeenLastCalledWith({ q: '', role: 'teacher', status: '', page: 1 }));
    await pickOption('users-filter-status', 'blocked');
    await waitFor(() => expect(mockSvc.fetchAdminUsers).toHaveBeenLastCalledWith({ q: '', role: 'teacher', status: 'blocked', page: 1 }));
  });

  test('search is debounced', async () => {
    jest.useFakeTimers();
    try {
      await render(<AdminUsersScreen navigation={{}} />);
      await act(async () => { jest.advanceTimersByTime(0); });
      await fireEvent.changeText(screen.getByTestId('users-search'), 'as');
      await fireEvent.changeText(screen.getByTestId('users-search'), 'asha');
      await act(async () => { jest.advanceTimersByTime(350); });
      const searches = mockSvc.fetchAdminUsers.mock.calls.filter(([f]) => f.q);
      expect(searches).toEqual([[{ q: 'asha', role: '', status: '', page: 1 }]]);
    } finally {
      jest.useRealTimers();
    }
  });

  test('edit: role change needs a second confirm, then saves and shows notice', async () => {
    mockSvc.updateAdminUser.mockResolvedValue({ changed: ['name', 'role'] });
    await render(<AdminUsersScreen navigation={{}} />);
    await fireEvent.press(await screen.findByTestId('users-edit-u1'));
    await fireEvent.changeText(screen.getByTestId('users-edit-name'), 'Asha R');
    await pickOption('users-edit-role', 'teacher');

    await fireEvent.press(screen.getByTestId('users-edit-save'));
    expect(await screen.findByTestId('users-edit-role-confirm')).toBeTruthy();
    expect(mockSvc.updateAdminUser).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Confirm & save'));
    await waitFor(() => expect(mockSvc.updateAdminUser).toHaveBeenCalledWith('u1', { name: 'Asha R', role: 'teacher', school: undefined }));
    expect(await screen.findByText(/Asha R updated — they've been notified/)).toBeTruthy();
  });

  test('edit: changing to student asks for curriculum, grade and section', async () => {
    mockSvc.updateAdminUser.mockResolvedValue({ changed: ['role'] });
    await render(<AdminUsersScreen navigation={{}} />);
    await fireEvent.press(await screen.findByTestId('users-edit-u2'));
    await pickOption('users-edit-role', 'student');
    await fireEvent.press(screen.getByTestId('users-edit-save'));
    expect(await screen.findByText('Choose a curriculum and grade for this student.')).toBeTruthy();

    await pickOption('users-field-curriculum', 'IB PYP');
    await pickOption('users-field-grade', 'Grade 3');
    await fireEvent.changeText(screen.getByTestId('users-field-section'), 'A');
    await fireEvent.press(screen.getByTestId('users-edit-save'));
    await fireEvent.press(await screen.findByText('Confirm & save'));
    await waitFor(() => expect(mockSvc.updateAdminUser).toHaveBeenCalledWith('u2', expect.objectContaining({
      role: 'student', curriculum: 'IB PYP', grade: 'Grade 3', section: 'A',
    })));
  });

  test('add user: validates, then sends an invitation', async () => {
    mockSvc.createAdminUser.mockResolvedValue({ user: {} as any, inviteSent: true, verificationSent: true });
    await render(<AdminUsersScreen navigation={{}} />);
    await fireEvent.press(await screen.findByTestId('users-add'));
    await fireEvent.press(screen.getByTestId('users-add-submit'));
    expect(await screen.findByText('Enter the full name.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('users-add-name'), 'Riya Shah');
    await fireEvent.changeText(screen.getByTestId('users-add-email'), 'Riya@Real.com');
    await pickOption('users-add-role', 'teacher');
    await pickOption('users-add-school', 'TSRA');
    await fireEvent.press(screen.getByTestId('users-add-submit'));
    await waitFor(() => expect(mockSvc.createAdminUser).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Riya Shah', email: 'riya@real.com', role: 'teacher', school: 'TSRA',
    })));
    expect(await screen.findByText(/Invitation sent to riya@real.com/)).toBeTruthy();
  });

  test('add user: reports when the account was created but the invite failed', async () => {
    mockSvc.createAdminUser.mockResolvedValue({ user: {} as any, inviteSent: false, inviteError: null, verificationSent: true });
    await render(<AdminUsersScreen navigation={{}} />);
    await fireEvent.press(await screen.findByTestId('users-add'));
    await fireEvent.changeText(screen.getByTestId('users-add-name'), 'Riya Shah');
    await fireEvent.changeText(screen.getByTestId('users-add-email'), 'riya@real.com');
    await pickOption('users-add-role', 'teacher');
    await fireEvent.press(screen.getByTestId('users-add-submit'));
    expect(await screen.findByText(/invite email could not be sent/)).toBeTruthy();
  });

  test('add user: school admin needs a school; student needs curriculum + grade', async () => {
    await render(<AdminUsersScreen navigation={{}} />);
    await fireEvent.press(await screen.findByTestId('users-add'));
    await fireEvent.changeText(screen.getByTestId('users-add-name'), 'X');
    await fireEvent.changeText(screen.getByTestId('users-add-email'), 'x@real.com');
    await fireEvent.press(screen.getByTestId('users-add-submit'));
    expect(await screen.findByText('Choose a curriculum and grade for this student.')).toBeTruthy();
    await pickOption('users-add-role', 'school_admin');
    await fireEvent.press(screen.getByTestId('users-add-submit'));
    expect(await screen.findByText('Choose the school this admin manages.')).toBeTruthy();
    expect(mockSvc.createAdminUser).not.toHaveBeenCalled();
  });

  test('edit: moving to B2C sends school null; server error is shown', async () => {
    mockSvc.updateAdminUser.mockRejectedValue(new Error('Cannot change a platform admin'));
    await render(<AdminUsersScreen navigation={{}} />);
    await fireEvent.press(await screen.findByTestId('users-edit-u1'));
    await pickOption('users-edit-school', '__b2c__');
    await fireEvent.press(screen.getByTestId('users-edit-save'));
    await waitFor(() => expect(mockSvc.updateAdminUser).toHaveBeenCalledWith('u1', { name: undefined, role: undefined, school: null }));
    expect(await screen.findByText('Cannot change a platform admin')).toBeTruthy();
  });

  test('block with reason + sign-out toggle; unblock has no reason', async () => {
    mockSvc.blockAdminUser.mockResolvedValue({} as any);
    mockSvc.unblockAdminUser.mockResolvedValue({} as any);
    await render(<AdminUsersScreen navigation={{}} />);
    await fireEvent.press(await screen.findByTestId('users-block-u1'));
    await pickOption('users-block-reason', 'Security concern');
    await fireEvent.press(screen.getByTestId('users-block-signout'));
    await fireEvent.press(screen.getByTestId('users-block-confirm'));
    await waitFor(() => expect(mockSvc.blockAdminUser).toHaveBeenCalledWith('u1', 'Security concern', false));
    expect(await screen.findByText('Asha Rao blocked.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('users-block-u2'));
    expect(screen.queryByTestId('users-block-reason')).toBeNull();
    await fireEvent.press(screen.getByTestId('users-block-confirm'));
    await waitFor(() => expect(mockSvc.unblockAdminUser).toHaveBeenCalledWith('u2'));
  });

  test('bulk: select all, block, notice reports skipped', async () => {
    mockSvc.bulkSetBlocked.mockResolvedValue({ results: [{ id: 'u1', ok: true }, { id: 'u2', ok: true }, { id: 'u3', ok: false, error: 'Cannot block a platform admin' }] } as any);
    await render(<AdminUsersScreen navigation={{}} />);
    await screen.findByTestId('users-row-u1');
    expect(screen.queryByTestId('users-selection-bar')).toBeNull();
    await fireEvent.press(screen.getByTestId('users-select-all'));
    expect(within(screen.getByTestId('users-selection-bar')).getByText('3 selected')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('users-bulk-block'));
    await waitFor(() => expect(mockSvc.bulkSetBlocked).toHaveBeenCalledWith(['u1', 'u2', 'u3'], true));
    expect(await screen.findByText('2 users blocked · 1 skipped (Cannot block a platform admin).')).toBeTruthy();
    expect(screen.queryByTestId('users-selection-bar')).toBeNull();
  });

  test('load error shows retry', async () => {
    mockSvc.fetchAdminUsers.mockRejectedValueOnce(new Error('Not authorized'));
    await render(<AdminUsersScreen navigation={{}} />);
    expect(await screen.findByText('Not authorized')).toBeTruthy();
    await fireEvent.press(screen.getByText('Retry'));
    expect(await screen.findByTestId('users-row-u1')).toBeTruthy();
  });

  test('lastActiveLabel', () => {
    const now = Date.parse('2026-10-10T12:00:00Z');
    expect(lastActiveLabel(null, now)).toBe('—');
    expect(lastActiveLabel('2026-10-10T11:58:00Z', now)).toBe('2 min ago');
    expect(lastActiveLabel('2026-10-10T09:00:00Z', now)).toBe('3 h ago');
    expect(lastActiveLabel('2026-10-09T10:00:00Z', now)).toBe('Yesterday');
    expect(lastActiveLabel('2026-10-05T12:00:00Z', now)).toBe('5 days ago');
  });
});

describe('AdminUsersScreen slide-over close', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSvc.fetchAdminUsers.mockResolvedValue({ users: USERS, total: 3, pageSize: 50 } as any);
  });

  test('the X button closes the Add user panel', async () => {
    await render(<AdminUsersScreen navigation={{}} />);
    await fireEvent.press(await screen.findByTestId('users-add'));
    expect(screen.getByTestId('users-add-name')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('users-panel-close'));
    await waitFor(() => expect(screen.queryByTestId('users-add-name')).toBeNull());
  });

  test('the backdrop closes the panel too', async () => {
    await render(<AdminUsersScreen navigation={{}} />);
    await fireEvent.press(await screen.findByTestId('users-add'));
    await fireEvent.press(screen.getByTestId('users-panel-backdrop'));
    await waitFor(() => expect(screen.queryByTestId('users-add-name')).toBeNull());
  });
});
