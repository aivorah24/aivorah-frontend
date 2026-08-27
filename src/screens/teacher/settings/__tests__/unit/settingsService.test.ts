// Unit tests for settingsService.ts — mocks global.fetch, verifies request
// shape/URL/method and response parsing. Every route here is fully migrated
// off the monolith (see the service file's own header comment).
import {
  fetchTeacherPreferences,
  patchTeacherPreference,
  uploadProfilePhoto,
  fetchBrandingLogos,
  uploadBrandingLogo,
  patchProfile,
  checkEmailTaken,
  sendEmailOtp,
  changeEmail,
  changeEmailGoogle,
  deleteAccount,
  addRole,
  createChildStudent,
  linkExistingChild,
} from '../../services/settingsService';
import AUTH_SERVER_URL from '../../../../../config/authServerUrl';
import PROFILE_SERVER_URL from '../../../../../config/profileServerUrl';

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('fetchTeacherPreferences', () => {
  test('a real ok response returns the parsed preferences', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ autoGrading: true }) });
    const result = await fetchTeacherPreferences('teacher@school.com');
    expect(global.fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/user/preferences?email=teacher%40school.com`);
    expect(result).toEqual({ autoGrading: true });
  });

  test('a real non-ok response resolves to null', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    expect(await fetchTeacherPreferences('teacher@school.com')).toBeNull();
  });
});

describe('patchTeacherPreference', () => {
  test('sends a real PATCH with the email and the single changed key', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await patchTeacherPreference('teacher@school.com', 'shareProgress', false);
    expect(global.fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/user/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@school.com', shareProgress: false }),
    });
  });
});

describe('uploadProfilePhoto', () => {
  // Migrated 2026-08-27: /user/upload-photo already exists identically on
  // aivorah-profile-service (confirmed contract match with the student
  // settings hook that already used it).
  test('sends a real POST to the migrated profile service with userEmail/base64/mimeType', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ photoUrl: 'https://cdn/a.png' }) });
    const result = await uploadProfilePhoto('teacher@school.com', 'abc123', 'image/png');
    expect(global.fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/user/upload-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: 'teacher@school.com', base64: 'abc123', mimeType: 'image/png' }),
    });
    expect(result).toEqual({ photoUrl: 'https://cdn/a.png' });
  });
});

describe('fetchBrandingLogos', () => {
  test('builds the URL with both real school and curriculum when both are given', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ schoolLogoUrl: 'a', curriculumLogoUrl: 'b' }) });
    const result = await fetchBrandingLogos('Riverdale High', 'IB PYP');
    expect(global.fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/branding/logos?school=Riverdale+High&curriculum=IB+PYP`);
    expect(result).toEqual({ schoolLogoUrl: 'a', curriculumLogoUrl: 'b' });
  });

  test('omits a param that is not real/provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await fetchBrandingLogos('Riverdale High', undefined);
    expect(global.fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/branding/logos?school=Riverdale+High`);
  });
});

describe('uploadBrandingLogo', () => {
  test('sends a real POST with kind/name/base64/mimeType and returns the parsed response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ logoUrl: 'https://cdn/logo.png' }) });
    const result = await uploadBrandingLogo('school', 'Riverdale High', 'abc123', 'image/png');
    expect(global.fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/branding/logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'school', name: 'Riverdale High', base64: 'abc123', mimeType: 'image/png' }),
    });
    expect(result).toEqual({ logoUrl: 'https://cdn/logo.png' });
  });
});

describe('patchProfile', () => {
  test('a real successful PATCH to the migrated profile service returns ok + the response body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', name: 'New Name' }) });
    const result = await patchProfile({ email: 'teacher@school.com', name: 'New Name' });
    expect(global.fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/user/profile`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@school.com', name: 'New Name' }),
    });
    expect(result).toEqual({ ok: true, id: 'u1', name: 'New Name' });
  });

  test('a real server error surfaces the error message, not a thrown exception', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'email required' }) });
    const result = await patchProfile({ email: '' });
    expect(result).toEqual({ error: 'email required' });
  });
});

describe('checkEmailTaken', () => {
  test('a real existing account -> true', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ role: 'teacher' }) });
    const result = await checkEmailTaken('taken@a.com');
    expect(global.fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/role?email=taken%40a.com`);
    expect(result).toBe(true);
  });

  test('no real account for that email -> false', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'User not found' }) });
    expect(await checkEmailTaken('free@a.com')).toBe(false);
  });
});

describe('sendEmailOtp', () => {
  test('sends a real POST to the migrated auth service with the email and name', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    await sendEmailOtp('new@a.com', 'Ms. Rao');
    expect(global.fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/email-otp/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@a.com', name: 'Ms. Rao' }),
    });
  });

  test('a real server error surfaces the error message, not a thrown exception', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Please enter a valid email address.' }) });
    const result = await sendEmailOtp('not-an-email');
    expect(result.error).toBe('Please enter a valid email address.');
  });
});

describe('changeEmail', () => {
  test('a real successful rename sends currentEmail/newEmail/otp and returns the updated user', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, user: { email: 'new@a.com' } }) });
    const result = await changeEmail('old@a.com', 'new@a.com', '123456');
    expect(global.fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/change-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentEmail: 'old@a.com', newEmail: 'new@a.com', otp: '123456' }),
    });
    expect(result.user.email).toBe('new@a.com');
  });

  test('a real Google-SSO refusal surfaces the special error code', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Google-linked', code: 'GOOGLE_SSO_EMAIL_IMMUTABLE' }) });
    const result = await changeEmail('old@a.com', 'new@a.com', '123456');
    expect(result.code).toBe('GOOGLE_SSO_EMAIL_IMMUTABLE');
  });
});

describe('changeEmailGoogle', () => {
  test('sends a real POST with currentEmail/idToken', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, newEmail: 'new@gmail.com' }) });
    const result = await changeEmailGoogle('old@a.com', 'fake-id-token');
    expect(global.fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/change-email-google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentEmail: 'old@a.com', idToken: 'fake-id-token' }),
    });
    expect(result.newEmail).toBe('new@gmail.com');
  });
});

describe('deleteAccount', () => {
  test('sends a real DELETE with the email', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    const result = await deleteAccount('gone@a.com');
    expect(global.fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/delete-account`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gone@a.com' }),
    });
    expect(result.ok).toBe(true);
  });
});

describe('addRole', () => {
  test('sends a real PATCH to the migrated profile service and returns the merged roles', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, roles: ['teacher', 'parent'] }) });
    const result = await addRole('teacher@school.com', 'parent');
    expect(global.fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/user/add-role`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@school.com', role: 'parent' }),
    });
    expect(result.roles).toEqual(['teacher', 'parent']);
  });
});

describe('createChildStudent', () => {
  test('sends a real POST to the migrated profile service with the child payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, child: { id: 'c1' } }) });
    const result = await createChildStudent('teacher@school.com', { name: 'Kid', grade: 'Grade 3', curriculum: 'IB PYP' });
    expect(global.fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/parent/teacher%40school.com/children/create-student`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Kid', grade: 'Grade 3', curriculum: 'IB PYP' }),
    });
    expect(result.success).toBe(true);
  });

  test('a real 409 (email already in use) surfaces the error, not a throw', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'An account with this email already exists.' }) });
    const result = await createChildStudent('teacher@school.com', { name: 'Kid', grade: 'Grade 3', curriculum: 'IB PYP', email: 'taken@a.com' });
    expect(result.error).toBe('An account with this email already exists.');
  });
});

describe('linkExistingChild', () => {
  test('sends a real POST with childEmail', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, child: { id: 'c1' } }) });
    const result = await linkExistingChild('teacher@school.com', 'kid@a.com');
    expect(global.fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/parent/teacher%40school.com/children`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childEmail: 'kid@a.com' }),
    });
    expect(result.success).toBe(true);
  });
});
