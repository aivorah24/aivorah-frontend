import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ConnectSchoolBanner from '../ConnectSchoolBanner';

let mockUser: any = null;
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { cardDark: '#111', accentYellow: '#ec0', textHeading: '#fff', textMuted: '#aaa' } }),
}));
jest.mock('../ConnectSchoolModal', () => () => null);

describe('ConnectSchoolBanner', () => {
  test('independent (no school) student: offered to join a school', async () => {
    mockUser = { role: 'student', schoolId: null };
    await render(<ConnectSchoolBanner />);
    expect(screen.getByText('Join a School Classroom')).toBeTruthy();
    expect(screen.getByText('Connect')).toBeTruthy();
  });

  test('student archived by their school (still has the old schoolId): offered to connect to a new school', async () => {
    mockUser = { role: 'student', schoolId: 'old-school', status: 'archived' };
    await render(<ConnectSchoolBanner />);
    expect(screen.getByText('Moving to a New School?')).toBeTruthy();
    expect(screen.getByText(/previous school has archived your account/)).toBeTruthy();
    expect(screen.getByText('Connect')).toBeTruthy();
  });

  test('active school student: nothing', async () => {
    mockUser = { role: 'student', schoolId: 'school-1', status: 'active' };
    await render(<ConnectSchoolBanner />);
    expect(screen.queryByText('Connect')).toBeNull();
  });

  test('school student before the status is known: nothing', async () => {
    mockUser = { role: 'student', schoolId: 'school-1' };
    await render(<ConnectSchoolBanner />);
    expect(screen.queryByText('Connect')).toBeNull();
  });

  test('archived teacher keeps the old behaviour (nothing)', async () => {
    mockUser = { role: 'teacher', schoolId: 'school-1', status: 'archived' };
    await render(<ConnectSchoolBanner />);
    expect(screen.queryByText('Connect')).toBeNull();
  });
});
