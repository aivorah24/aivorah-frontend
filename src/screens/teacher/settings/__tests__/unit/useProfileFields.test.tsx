import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useProfileFields } from '../../hooks/useProfileFields';
import type { TeachingEntry } from '@legacy/school-admin/TeachingEntriesEditor';

const mockPatchProfile = jest.fn();
jest.mock('../../services/settingsService', () => ({
  patchProfile: (...args: any[]) => mockPatchProfile(...args),
}));

const ENTRIES: TeachingEntry[] = [{ curriculum: 'IB MYP', grade: 'Grade 7', subjectsInput: 'Math, Science' }];

function Harness({ email = 'teacher@school.com' }: { email?: string }) {
  const h = useProfileFields(email, mockUpdateUser);
  return (
    <View>
      <Text testID="saving">{String(h.saving)}</Text>
      <Text testID="error">{h.error}</Text>
      <TouchableOpacity testID="saveName" onPress={() => h.saveName('New Name')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="saveEmptyName" onPress={() => h.saveName('  ')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="saveSchool" onPress={() => h.saveSchool('Riverdale High')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="saveCurriculum" onPress={() => h.saveCurriculum(ENTRIES)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="saveEmptyCurriculum" onPress={() => h.saveCurriculum([{ curriculum: '', grade: '', subjectsInput: '' }])}><Text>x</Text></TouchableOpacity>
    </View>
  );
}

const mockUpdateUser = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockPatchProfile.mockResolvedValue({ ok: true });
});

describe('useProfileFields — saveName', () => {
  test('a real blank name is rejected locally, never calls the service', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('saveEmptyName'));
    expect(screen.getByTestId('error').props.children).toBe('Please enter a name.');
    expect(mockPatchProfile).not.toHaveBeenCalled();
  });

  test('a real successful save trims the name, updates the user, and clears saving', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('saveName'));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ name: 'New Name' }));
    expect(mockPatchProfile).toHaveBeenCalledWith({ email: 'teacher@school.com', name: 'New Name' });
    expect(screen.getByTestId('saving').props.children).toBe('false');
  });

  test('a real server error surfaces without updating the user', async () => {
    mockPatchProfile.mockResolvedValue({ error: 'Failed to save' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('saveName'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Failed to save'));
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

describe('useProfileFields — saveSchool', () => {
  test('a real successful save trims + updates the user', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('saveSchool'));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ school: 'Riverdale High' }));
    expect(mockPatchProfile).toHaveBeenCalledWith({ email: 'teacher@school.com', school: 'Riverdale High' });
  });
});

describe('useProfileFields — saveCurriculum', () => {
  test('a real entry with no curriculum/grade filled in is rejected locally', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('saveEmptyCurriculum'));
    expect(screen.getByTestId('error').props.children).toBe('Please add at least one curriculum + grade.');
    expect(mockPatchProfile).not.toHaveBeenCalled();
  });

  test('a real valid entry sends the primary curriculum/grade plus the full teaches array', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('saveCurriculum'));
    await waitFor(() => expect(mockPatchProfile).toHaveBeenCalled());
    expect(mockPatchProfile).toHaveBeenCalledWith({
      email: 'teacher@school.com', curriculum: 'IB MYP', grade: 'Grade 7',
      teaches: [{ curriculum: 'IB MYP', grade: 'Grade 7', subjects: ['Math', 'Science'] }],
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({
      curriculum: 'IB MYP', grade: 'Grade 7',
      teaches: [{ curriculum: 'IB MYP', grade: 'Grade 7', subjects: ['Math', 'Science'] }],
    });
  });
});
