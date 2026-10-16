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
      <Text testID="gradeError">{hook.gradeError || ''}</Text>
      <Text testID="curriculumError">{hook.curriculumError || ''}</Text>
      <TouchableOpacity testID="setGrade7" onPress={() => hook.setSelectedGrade('Grade 7')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setGrade11" onPress={() => hook.setSelectedGrade('Grade 11')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setDP" onPress={() => hook.setSelectedCurriculum('IB DP')}><Text>x</Text></TouchableOpacity>
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

// Regression tests for Bug #27 (reported 2026-08-28): "If user entered the
// grade 9 instead of 10 - the grade section is not showing up grade... so
// please make sure user will get full grade control edit here." Previously
// GRADES was sliced to "current grade and higher only" — a Grade 10 account
// (even a mistaken one) could never be corrected back down to Grade 9,
// because Grade 9 was never offered as an option. Full edit control means
// every real grade must always be selectable, regardless of the account's
// current value.
describe('useProfileFields — GRADES always offers the full real grade list', () => {
  test('a Grade 10 account can still select a LOWER grade (e.g. Grade 9) — the actual reported bug', async () => {
    await render(<Harness user={{ name: 'A', grade: 'Grade 10', curriculum: 'NCERT', email: 'a@a.com' }} />);
    const grades = JSON.parse(screen.getByTestId('grades').props.children);
    expect(grades).toContain('Grade 9');
  });

  test('the full 15-grade list (Nursery through Grade 12) is always offered, not just current-and-above', async () => {
    await render(<Harness user={{ name: 'A', grade: 'Grade 10', curriculum: 'NCERT', email: 'a@a.com' }} />);
    const grades = JSON.parse(screen.getByTestId('grades').props.children);
    expect(grades).toEqual(['Nursery', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']);
  });

  test('an unrecognized current grade also falls back to the real full grade list', async () => {
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
  test('saves the real selected grade via the profile service\'s /user/profile, updates locally, and closes the modal', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('setGrade'));
    await user.press(screen.getByTestId('saveGrade'));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ grade: 'Grade 5' }));
    expect(mockCloseModal).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/user/profile'), expect.objectContaining({
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
  test('saves a legacy "NCERT" pick as CBSE', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('setCurriculum'));
    await user.press(screen.getByTestId('saveCurriculum'));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ curriculum: 'CBSE' }));
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls.at(-1)[1].body).curriculum).toBe('CBSE');
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
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/user/profile'), expect.objectContaining({
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

describe('useProfileFields — IB grade ranges', () => {
  test('IB DP + Grade 7 shows the error and does not save', async () => {
    const user = userEvent.setup();
    await render(<Harness user={{ name: 'A', grade: 'Grade 11', curriculum: 'IB DP', email: 'a@a.com' }} />);
    await user.press(screen.getByTestId('setGrade7'));
    expect(screen.getByTestId('gradeError').props.children).toBe('IB DP is only for Grade 11–12. Please choose Grade 11 or 12, or switch to IB MYP for Grade 7.');
    await user.press(screen.getByTestId('saveGrade'));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('switching a Grade 7 student to IB DP needs a DP grade, then saves both together', async () => {
    const user = userEvent.setup();
    await render(<Harness user={{ name: 'A', grade: 'Grade 7', curriculum: 'IB MYP', email: 'a@a.com' }} />);
    await user.press(screen.getByTestId('setDP'));
    expect(screen.getByTestId('curriculumError').props.children).toMatch(/IB DP is only for Grade 11–12/);
    await user.press(screen.getByTestId('saveCurriculum'));
    expect(global.fetch).not.toHaveBeenCalled();
    await user.press(screen.getByTestId('setGrade11'));
    await user.press(screen.getByTestId('saveCurriculum'));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ curriculum: 'IB DP', grade: 'Grade 11' }));
  });
});
