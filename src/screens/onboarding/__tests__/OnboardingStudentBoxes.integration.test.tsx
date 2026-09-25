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
jest.setTimeout(15000);
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

let mockAuthUser: Record<string, any> = { email: 'a@a.com', role: 'student', name: '' };
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
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
  mockAuthUser = { email: 'a@a.com', role: 'student', name: '' };
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

  // Regression test: "Save & Exit" used to PATCH /user/profile on the old
  // monolith (SERVER_URL) with no response-status check at all, so a failed
  // save (e.g. name/school) was silently lost. It must now go to the
  // migrated profile microservice instead.
  test('"Save & go to home page" saves the real typed name and school to the profile microservice', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.type(screen.getByPlaceholderText('Your name'), 'Progress Saver');
    await user.type(
      screen.getByPlaceholderText('Type your school name (e.g. Senthil Public School)'),
      'The Progress Academy',
    );

    await user.press(screen.getByLabelText('Back to home page'));
    await user.press(await screen.findByText('Save & go to home page'));

    await new Promise((r) => setTimeout(r, 0)); // flush the awaited saveProgress()

    const profileCall = (global.fetch as jest.Mock).mock.calls.find(([url]) =>
      String(url).includes('/user/profile'),
    );
    expect(profileCall).toBeTruthy();
    const [url, options] = profileCall!;
    expect(url).not.toContain('aivorah.ai'); // must not hit the monolith
    expect(url).toContain('profile-service');
    const body = JSON.parse(options.body);
    expect(body.name).toBe('Progress Saver');
    expect(body.school).toBe('The Progress Academy');
  });

  // Regression test for the "Gender/DOB/State missing on re-login" bug
  // (2026-08-26) — same fix, "Save & Exit" path.
  test('"Save & go to home page" sends the real typed dob AND gender on the primary /user/profile PATCH', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.type(screen.getByPlaceholderText('Your name'), 'Progress Saver');
    await user.type(screen.getByPlaceholderText('DD/MM/YYYY'), agedDob(15));
    await user.press(screen.getByText('Female'));

    await user.press(screen.getByLabelText('Back to home page'));
    await user.press(await screen.findByText('Save & go to home page'));

    await new Promise((r) => setTimeout(r, 0));

    const profileCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/user/profile'));
    expect(profileCall).toBeTruthy();
    const body = JSON.parse(profileCall![1].body);
    expect(body.dob).toBe(agedDob(15));
    expect(body.gender).toBe('Female');
  });

  test('"Save & go to home page" sends the picked avatar and learning style on the awaited /user/profile PATCH', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.type(screen.getByPlaceholderText('Your name'), 'Progress Saver');
    await user.press(screen.getByText('Gamer'));
    await user.press(screen.getByText('Visual'));

    await user.press(screen.getByLabelText('Back to home page'));
    await user.press(await screen.findByText('Save & go to home page'));

    await new Promise((r) => setTimeout(r, 0));

    const profileCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/user/profile'));
    const body = JSON.parse(profileCall![1].body);
    expect(body.avatarStyle).toBe('gamer');
    expect(body.learningStyle).toBe('visual');
  });

  async function saveAndGetProfileBody(user: ReturnType<typeof userEvent.setup>) {
    await user.press(screen.getByLabelText('Back to home page'));
    await user.press(await screen.findByText('Save & go to home page'));
    await new Promise((r) => setTimeout(r, 0));
    const call = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/user/profile'));
    return JSON.parse(call![1].body);
  }

  test('resuming onboarding keeps the previously saved avatar and learning style', async () => {
    mockAuthUser = { email: 'a@a.com', role: 'student', name: 'Brintha', avatarStyle: 'casual', learningStyle: 'visual' };
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    const body = await saveAndGetProfileBody(user);
    expect(body.avatarStyle).toBe('casual');
    expect(body.learningStyle).toBe('visual');
  });

  test('saved avatar and learning style that load after the screen opens are adopted', async () => {
    const user = userEvent.setup();
    const { rerender } = await render(<OnboardingStudentBoxes />);

    mockAuthUser = { ...mockAuthUser, avatarStyle: 'casual', learningStyle: 'visual' };
    await rerender(<OnboardingStudentBoxes />);

    const body = await saveAndGetProfileBody(user);
    expect(body.avatarStyle).toBe('casual');
    expect(body.learningStyle).toBe('visual');
  });

  test('a late-loading saved avatar does not override one the student already picked', async () => {
    const user = userEvent.setup();
    const { rerender } = await render(<OnboardingStudentBoxes />);
    await user.press(screen.getByText('Gamer'));

    mockAuthUser = { ...mockAuthUser, avatarStyle: 'casual' };
    await rerender(<OnboardingStudentBoxes />);

    const body = await saveAndGetProfileBody(user);
    expect(body.avatarStyle).toBe('gamer');
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

// DOB <-> Grade mismatch warning + hard block on Complete Setup.
describe('OnboardingStudentBoxes — DOB/Grade consistency', () => {
  const warningFor = (grade: string) => new RegExp(`doesn't match ${grade}`);

  test('mismatched DOB + Grade shows an inline warning', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.press(screen.getByText('CBSE'));
    await user.type(screen.getByPlaceholderText('DD/MM/YYYY'), agedDob(15)); // ~15yo
    await user.press(await screen.findByText('Grade 3')); // expects age 6-10

    expect(screen.getByText(warningFor('Grade 3'))).toBeTruthy();
  });

  test('matching DOB + Grade shows no warning', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.press(screen.getByText('CBSE'));
    await user.type(screen.getByPlaceholderText('DD/MM/YYYY'), agedDob(8)); // ~8yo, fits Grade 3
    await user.press(await screen.findByText('Grade 3'));

    expect(screen.queryByText(warningFor('Grade 3'))).toBeNull();
  });

  test('changing Grade after a mismatch updates (clears) the warning', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.press(screen.getByText('CBSE'));
    await user.type(screen.getByPlaceholderText('DD/MM/YYYY'), agedDob(15));
    await user.press(await screen.findByText('Grade 3'));
    expect(screen.getByText(warningFor('Grade 3'))).toBeTruthy();

    await user.press(await screen.findByText('Grade 9')); // ~15yo fits Grade 9 (12-16)
    expect(screen.queryByText(warningFor('Grade 3'))).toBeNull();
    expect(screen.queryByText(warningFor('Grade 9'))).toBeNull();
  });

  test('changing DOB after a mismatch updates (clears) the warning', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.press(screen.getByText('CBSE'));
    const dobInput = screen.getByPlaceholderText('DD/MM/YYYY');
    await user.type(dobInput, agedDob(15));
    await user.press(await screen.findByText('Grade 3'));
    expect(screen.getByText(warningFor('Grade 3'))).toBeTruthy();

    await user.clear(dobInput);
    await user.type(dobInput, agedDob(8)); // now fits Grade 3
    expect(screen.queryByText(warningFor('Grade 3'))).toBeNull();
  });

  test('mismatched DOB + Grade blocks Complete Setup and never calls /user/profile or /user/preferences', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.type(screen.getByPlaceholderText('Your name'), 'A Student');
    await user.type(screen.getByPlaceholderText('DD/MM/YYYY'), agedDob(15)); // 15yo -> passes the under-14 gate
    await user.press(screen.getByText('CBSE'));
    await user.type(screen.getByPlaceholderText('Type your school name (e.g. Senthil Public School)'), 'Hyderabad International School');
    await user.press(await screen.findByText('Grade 3')); // but 15yo doesn't fit Grade 3

    const button = screen.getByText('Complete Setup').parent;
    expect(button?.props.accessibilityState?.disabled).toBe(false); // required-fields gate alone doesn't catch this

    (global.fetch as jest.Mock).mockClear();
    await user.press(screen.getByText('Complete Setup'));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getAllByText(warningFor('Grade 3')).length).toBeGreaterThan(0); // error surfaced via saveError (and the live warning)
    const profileCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/user/profile'));
    const prefsCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/user/preferences'));
    expect(profileCall).toBeUndefined();
    expect(prefsCall).toBeUndefined();
  });

  test('matching DOB + Grade lets Complete Setup submit normally', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.type(screen.getByPlaceholderText('Your name'), 'A Student');
    await user.type(screen.getByPlaceholderText('DD/MM/YYYY'), agedDob(15)); // 15yo
    await user.press(screen.getByText('CBSE'));
    await user.type(screen.getByPlaceholderText('Type your school name (e.g. Senthil Public School)'), 'Hyderabad International School');
    await user.press(await screen.findByText('Grade 9')); // 15yo fits Grade 9 (12-16)

    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (String(url).includes('/user/profile') ? { grade: 'Grade 9', curriculum: 'CBSE' } : []),
        text: async () => '',
      }),
    );

    await user.press(screen.getByText('Complete Setup'));
    await new Promise((r) => setTimeout(r, 0));

    const profileCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/user/profile'));
    expect(profileCall).toBeTruthy();
  });

  // Regression test for the "Gender/DOB/State missing on re-login" bug
  // (2026-08-26): dob/gender used to be sent ONLY on the un-awaited
  // /user/preferences PATCH, never on this primary, awaited /user/profile
  // PATCH — so a failed/slow preferences call silently lost them even when
  // the profile save itself succeeded. They must now be on both.
  test('Complete Setup sends the real typed dob AND gender on the primary (awaited) /user/profile PATCH', async () => {
    const user = userEvent.setup();
    await render(<OnboardingStudentBoxes />);

    await user.type(screen.getByPlaceholderText('Your name'), 'A Student');
    await user.type(screen.getByPlaceholderText('DD/MM/YYYY'), agedDob(15));
    await user.press(screen.getByText('Male'));
    await user.press(screen.getByText('CBSE'));
    await user.type(screen.getByPlaceholderText('Type your school name (e.g. Senthil Public School)'), 'Hyderabad International School');
    await user.press(await screen.findByText('Grade 9')); // 15yo fits Grade 9 (12-16)

    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (String(url).includes('/user/profile') ? { grade: 'Grade 9', curriculum: 'CBSE' } : []),
        text: async () => '',
      }),
    );

    await user.press(screen.getByText('Complete Setup'));
    await new Promise((r) => setTimeout(r, 0));

    const profileCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/user/profile'));
    expect(profileCall).toBeTruthy();
    const body = JSON.parse(profileCall![1].body);
    expect(body.dob).toBe(agedDob(15));
    expect(body.gender).toBe('Male');
  });
});
