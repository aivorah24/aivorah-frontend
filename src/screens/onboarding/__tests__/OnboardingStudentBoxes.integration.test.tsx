// Integration test for OnboardingStudentBoxes — the REAL, live student
// onboarding screen (OnboardingScreen.tsx just routes to this). Renders the
// real component, fills real fields, presses real chips, and checks the
// real "Complete Setup" gating behavior. AuthContext/ThemeContext mocked;
// network (fetch) mocked so autocomplete calls don't hit a real server.

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import OnboardingStudentBoxes from '../OnboardingStudentBoxes';

// Not exercised by this test — mocked out because the real firebase package
// ships ESM-only builds Jest can't parse, and this component transitively
// pulls it in via OnboardingScreen -> OnboardingTeacherBoxes -> phoneOtpVerification.
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), deleteApp: jest.fn() }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  RecaptchaVerifier: jest.fn(),
  signInWithPhoneNumber: jest.fn(),
}));
jest.mock('../../../config/firebase', () => ({}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'a@a.com', role: 'student', name: '' },
    updateUser: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, isDark: true }),
}));

function agedDob(yearsAgo: number): string {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${today.getFullYear() - yearsAgo}`;
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ json: async () => [], ok: true });
});

describe('OnboardingStudentBoxes', () => {
  test('renders all three required cards', async () => {
    await render(<OnboardingStudentBoxes />);
    expect(screen.getByPlaceholderText('Your name')).toBeTruthy();
    expect(screen.getByPlaceholderText('DD/MM/YYYY')).toBeTruthy();
    expect(screen.getByText('IB PYP')).toBeTruthy(); // a curriculum chip
  });

  test('Complete Setup is disabled and the required-fields hint is shown before anything is filled', async () => {
    await render(<OnboardingStudentBoxes />);
    expect(screen.getByText('Complete About You, Curriculum and School & Grade to continue')).toBeTruthy();

    const button = screen.getByText('Complete Setup').parent;
    expect(button?.props.accessibilityState?.disabled).toBe(true);
  });

  test('filling all three required cards enables Complete Setup and clears the hint', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.type(screen.getByPlaceholderText('Your name'), 'A Student');
    await user.type(screen.getByPlaceholderText('DD/MM/YYYY'), agedDob(15));
    await user.press(screen.getByText('IB PYP'));
    await user.type(screen.getByPlaceholderText('Type your school name (e.g. Senthil Public School)'), 'Hyderabad International School');
    await user.press(await screen.findByText('Grade 4'));

    expect(screen.queryByText('Complete About You, Curriculum and School & Grade to continue')).toBeNull();
    const button = screen.getByText('Complete Setup').parent;
    expect(button?.props.accessibilityState?.disabled).toBe(false);
  });

  test('under-14 date of birth blocks the About You card from completing', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.type(screen.getByPlaceholderText('Your name'), 'A Student');
    await user.type(screen.getByPlaceholderText('DD/MM/YYYY'), agedDob(10));
    await user.press(screen.getByText('IB PYP'));
    await user.type(screen.getByPlaceholderText('Type your school name (e.g. Senthil Public School)'), 'Hyderabad International School');
    await user.press(await screen.findByText('Grade 4'));

    // About You still incomplete (under 14) even though the other two cards are filled.
    expect(screen.getByText('Complete About You, Curriculum and School & Grade to continue')).toBeTruthy();
  });
});
