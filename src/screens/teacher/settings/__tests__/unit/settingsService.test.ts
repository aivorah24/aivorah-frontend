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
  deleteAccount,
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
