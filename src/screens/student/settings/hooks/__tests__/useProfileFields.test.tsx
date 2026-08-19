import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useProfileFields } from '../useProfileFields';

jest.setTimeout(15000);

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const mockUpdateUser = jest.fn();
const mockCloseModal = jest.fn();

function Harness({ user = { name: 'Aanya', grade: 'Grade 4', curriculum: 'IB PYP', location: 'Hyderabad', email: 'a@a.com' } }: any) {
  const hook = useProfileFields(user, mockUpdateUser, mockCloseModal);
  return (
    <>
      <Text testID="newName">{hook.newName}</Text>
      <Text testID="nameError">{hook.nameError}</Text>
      <Text testID="grades">{JSON.stringify(hook.GRADES)}</Text>
      <Text testID="selectedGrade">{hook.selectedGrade}</Text>
      <Text testID="gradeLoading">{String(hook.gradeLoading)}</Text>
      <Text testID="selectedCurriculum">{hook.selectedCurriculum}</Text>
      <Text testID="curriculumLoading">{String(hook.curriculumLoading)}</Text>
      <Text testID="newLocation">{hook.newLocation}</Text>
      <Text testID="locationLoading">{String(hook.locationLoading)}</Text>
      <TouchableOpacity testID="setNameEmpty" onPress={() => hook.setNewName('  ')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setNameValid" onPress={() => hook.setNewName('New Name')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="saveName" onPress={() => hook.handleSaveName()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setGrade" onPress={() => hook.setSelectedGrade('Grade 5')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="saveGrade" onPress={() => hook.handleSaveGrade()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setCurriculum" onPress={() => hook.setSelectedCurriculum('NCERT')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="saveCurriculum" onPress={() => hook.handleSaveCurriculum()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setLocation" onPress={() => hook.setNewLocation('  Mumbai  ')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="saveLocation" onPress={() => hook.handleSaveLocation()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="reset" onPress={() => hook.resetForm()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue(jsonRes({})) as any;
});

describe('useProfileFields — GRADES restriction', () => {
  test('only offers the real current grade and higher — never lower grades', async () => {
    await render(<Harness user={{ name: 'A', grade: 'Grade 10', curriculum: 'NCERT', email: 'a@a.com' }} />);
    const grades = JSON.parse(screen.getByTestId('grades').props.children);
    expect(grades[0]).toBe('Grade 10');
    expect(grades).not.toContain('Grade 9');
  });

  test('an unrecognized current grade falls back to the real full grade list', async () => {
    await render(<Harness user={{ name: 'A', grade: 'Not A Real Grade', email: 'a@a.com' }} />);
    const grades = JSON.parse(screen.getByTestId('grades').props.children);
    expect(grades.length).toBeGreaterThan(1);
  });
});

describe('useProfileFields — name', () => {
  test('an empty/whitespace name sets a real validation error, no save', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('setNameEmpty'));
    await user.press(screen.getByTestId('saveName'));

    expect(screen.getByTestId('nameError').props.children).toBe('Please enter a name.');
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test('a valid name updates locally immediately, closes the modal, then persists via a real PATCH to /user/profile', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('setNameValid'));
    await user.press(screen.getByTestId('saveName'));

    expect(mockUpdateUser).toHaveBeenCalledWith({ name: 'New Name' });
    expect(mockCloseModal).toHaveBeenCalled();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/user/profile'), expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ email: 'a@a.com', name: 'New Name' }),
    })));
  });

  test('a real PATCH failure is swallowed — the local update already happened (fire-and-forget)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('setNameValid'));
    await user.press(screen.getByTestId('saveName'));

    expect(mockUpdateUser).toHaveBeenCalledWith({ name: 'New Name' });
    expect(mockCloseModal).toHaveBeenCalled();
  });
});

describe('useProfileFields — grade', () => {
  test('saves the real selected grade via /user/preferences, updates locally, and closes the modal', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('setGrade'));
    await user.press(screen.getByTestId('saveGrade'));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ grade: 'Grade 5' }));
    expect(mockCloseModal).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/user/preferences'), expect.objectContaining({
      body: JSON.stringify({ email: 'a@a.com', grade: 'Grade 5' }),
    }));
  });

  test('a real PATCH failure still updates locally and closes (fail-open)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('setGrade'));
    await user.press(screen.getByTestId('saveGrade'));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ grade: 'Grade 5' }));
    expect(mockCloseModal).toHaveBeenCalled();
  });

  test('saving with no grade selected is a real no-op', async () => {
    const user = userEvent.setup();
    await render(<Harness user={{ name: 'A', grade: '', email: 'a@a.com' }} />);

    await user.press(screen.getByTestId('saveGrade'));

    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

describe('useProfileFields — curriculum', () => {
  test('saves the real selected curriculum', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('setCurriculum'));
    await user.press(screen.getByTestId('saveCurriculum'));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ curriculum: 'NCERT' }));
  });

  test('saving with no curriculum selected is a real no-op', async () => {
    const user = userEvent.setup();
    await render(<Harness user={{ name: 'A', grade: 'Grade 4', curriculum: '', email: 'a@a.com' }} />);

    await user.press(screen.getByTestId('saveCurriculum'));

    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

describe('useProfileFields — location', () => {
  test('trims the real location before saving', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('setLocation'));
    await user.press(screen.getByTestId('saveLocation'));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ location: 'Mumbai' }));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/user/preferences'), expect.objectContaining({
      body: JSON.stringify({ email: 'a@a.com', location: 'Mumbai' }),
    }));
  });
});

describe('useProfileFields — resetForm', () => {
  test('restores all real fields back to the current real user values', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('setNameValid'));
    await user.press(screen.getByTestId('reset'));

    expect(screen.getByTestId('newName').props.children).toBe('Aanya');
  });
});
