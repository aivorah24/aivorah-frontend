import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useParentProfile } from '../../hooks/useParentProfile';

const mockAddRole = jest.fn();
const mockCreateChildStudent = jest.fn();
const mockLinkExistingChild = jest.fn();
jest.mock('../../services/settingsService', () => ({
  addRole: (...args: any[]) => mockAddRole(...args),
  createChildStudent: (...args: any[]) => mockCreateChildStudent(...args),
  linkExistingChild: (...args: any[]) => mockLinkExistingChild(...args),
}));

const CHILD = { name: 'Kid', grade: 'Grade 3', curriculum: 'IB PYP' };
const mockUpdateUser = jest.fn();

function Harness({ email = 'teacher@school.com' }: { email?: string }) {
  const h = useParentProfile(email, mockUpdateUser);
  return (
    <View>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{h.error}</Text>
      <TouchableOpacity testID="createChild" onPress={() => h.createChild(CHILD)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="createChildNoName" onPress={() => h.createChild({ ...CHILD, name: '  ' })}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="linkChild" onPress={() => h.linkChild('kid@a.com')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="linkChildBlank" onPress={() => h.linkChild('')}><Text>x</Text></TouchableOpacity>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAddRole.mockResolvedValue({ ok: true, roles: ['teacher', 'parent'] });
  mockCreateChildStudent.mockResolvedValue({ success: true, child: { id: 'c1' } });
  mockLinkExistingChild.mockResolvedValue({ success: true, child: { id: 'c1' } });
});

describe('useParentProfile — createChild', () => {
  test('a real blank child name is rejected locally, never calls the service', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('createChildNoName'));
    expect(screen.getByTestId('error').props.children).toBe("Child's name is required.");
    expect(mockAddRole).not.toHaveBeenCalled();
  });

  test('a real successful creation adds the parent role first, then creates the child, then updates roles', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('createChild'));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ roles: ['teacher', 'parent'] }));
    expect(mockAddRole).toHaveBeenCalledWith('teacher@school.com', 'parent');
    expect(mockCreateChildStudent).toHaveBeenCalledWith('teacher@school.com', CHILD);
  });

  test('a real add-role failure stops before creating the child', async () => {
    mockAddRole.mockResolvedValue({ error: 'Failed to add parent role' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('createChild'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Failed to add parent role'));
    expect(mockCreateChildStudent).not.toHaveBeenCalled();
  });

  test('a real 409 (email already in use) surfaces the error, never updates roles', async () => {
    mockCreateChildStudent.mockResolvedValue({ error: 'An account with this email already exists.' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('createChild'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('An account with this email already exists.'));
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

describe('useParentProfile — linkChild', () => {
  test('a real blank email is rejected locally', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('linkChildBlank'));
    expect(screen.getByTestId('error').props.children).toBe('Please enter the student email.');
    expect(mockAddRole).not.toHaveBeenCalled();
  });

  test('a real successful link adds the parent role first, then links, then updates roles', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('linkChild'));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ roles: ['teacher', 'parent'] }));
    expect(mockLinkExistingChild).toHaveBeenCalledWith('teacher@school.com', 'kid@a.com');
  });

  test('a real unknown child email surfaces the real server error', async () => {
    mockLinkExistingChild.mockResolvedValue({ error: 'No student found with that email. Ask your child to register first.' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('linkChild'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('No student found with that email. Ask your child to register first.'));
  });
});
