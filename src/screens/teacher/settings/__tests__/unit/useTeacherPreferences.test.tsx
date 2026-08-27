// Standalone unit test for useTeacherPreferences — server-enforced prefs
// (AI Auto-Grading, Share Progress) loaded from and PATCHed via
// services/settingsService.ts. Same harness pattern as
// useNotificationPreferences (no RNTL renderHook in this version).
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useTeacherPreferences } from '../../hooks/useTeacherPreferences';

const mockFetchTeacherPreferences = jest.fn();
const mockPatchTeacherPreference = jest.fn();
jest.mock('../../services/settingsService', () => ({
  fetchTeacherPreferences: (...args: any[]) => mockFetchTeacherPreferences(...args),
  patchTeacherPreference: (...args: any[]) => mockPatchTeacherPreference(...args),
}));

function Harness({ email }: { email: string | undefined }) {
  const h = useTeacherPreferences(email);
  return (
    <View>
      <Text testID="autoGrading">{String(h.autoGrading)}</Text>
      <Text testID="shareProgress">{String(h.shareProgress)}</Text>
      <Text testID="teacherRoleVal">{String(h.teacherRoleVal)}</Text>
      <Text testID="experienceVal">{String(h.experienceVal)}</Text>
      <TouchableOpacity testID="toggle-autoGrading" onPress={() => h.saveTeacherPref('autoGrading', !h.autoGrading)}>
        <Text>toggle</Text>
      </TouchableOpacity>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchTeacherPreferences.mockResolvedValue(null);
  mockPatchTeacherPreference.mockResolvedValue(undefined);
});

describe('useTeacherPreferences', () => {
  test('defaults before the fetch resolves: autoGrading/shareProgress on, role/experience unset', async () => {
    mockFetchTeacherPreferences.mockReturnValue(new Promise(() => {})); // never resolves
    await render(<Harness email="teacher@school.com" />);
    expect(screen.getByTestId('autoGrading').props.children).toBe('true');
    expect(screen.getByTestId('shareProgress').props.children).toBe('true');
    expect(screen.getByTestId('teacherRoleVal').props.children).toBe('null');
  });

  test('a real server profile response overrides autoGrading/shareProgress/role/experience', async () => {
    mockFetchTeacherPreferences.mockResolvedValue({
      autoGrading: false, shareProgress: false, teacherRole: 'Subject Teacher', experience: '5-10 years',
    });
    await render(<Harness email="teacher@school.com" />);

    await waitFor(() => expect(screen.getByTestId('autoGrading').props.children).toBe('false'));
    expect(screen.getByTestId('shareProgress').props.children).toBe('false');
    expect(screen.getByTestId('teacherRoleVal').props.children).toBe('Subject Teacher');
    expect(screen.getByTestId('experienceVal').props.children).toBe('5-10 years');
    expect(mockFetchTeacherPreferences).toHaveBeenCalledWith('teacher@school.com');
  });

  test('no email -> never fetches, stays on defaults', async () => {
    await render(<Harness email={undefined} />);
    expect(mockFetchTeacherPreferences).not.toHaveBeenCalled();
    expect(screen.getByTestId('autoGrading').props.children).toBe('true');
  });

  test('a real network failure on load degrades to defaults, never crashes', async () => {
    mockFetchTeacherPreferences.mockRejectedValue(new Error('network down'));
    await render(<Harness email="teacher@school.com" />);

    await waitFor(() => expect(screen.getByTestId('autoGrading')).toBeTruthy());
    expect(screen.getByTestId('autoGrading').props.children).toBe('true');
  });

  test('toggling a pref sends a real PATCH with the new value for that key only', async () => {
    const user = userEvent.setup();
    await render(<Harness email="teacher@school.com" />);
    mockPatchTeacherPreference.mockClear();

    await user.press(screen.getByTestId('toggle-autoGrading'));

    expect(mockPatchTeacherPreference).toHaveBeenCalledWith('teacher@school.com', 'autoGrading', false);
  });

  test('saveTeacherPref with no email is a no-op, never calls the service', async () => {
    await render(<Harness email={undefined} />);
    mockPatchTeacherPreference.mockClear();
    const user = userEvent.setup();

    await user.press(screen.getByTestId('toggle-autoGrading'));

    expect(mockPatchTeacherPreference).not.toHaveBeenCalled();
  });
});
