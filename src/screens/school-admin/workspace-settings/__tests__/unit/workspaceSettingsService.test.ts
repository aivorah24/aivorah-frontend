import { fetchWorkspaceOverview, saveWorkspaceSettings, fetchSchoolLogo, uploadSchoolLogo } from '../../services/workspaceSettingsService';

describe('workspaceSettingsService', () => {
  beforeEach(() => { global.fetch = jest.fn(); });

  it('fetches the school overview', async () => {
    const school = { id: '1', name: 'TSRA', academicYear: '2026-27', contactEmail: 'a@x.com' };
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ school }) });
    const result = await fetchWorkspaceOverview('admin@x.com');
    expect(result).toEqual(school);
  });

  it('throws with the server error message on overview failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'not assigned' }) });
    await expect(fetchWorkspaceOverview('admin@x.com')).rejects.toThrow('not assigned');
  });

  it('PATCHes settings and returns the updated school', async () => {
    const updated = { id: '1', name: 'New Name', academicYear: '2027-28', contactEmail: '' };
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ school: updated }) });
    const result = await saveWorkspaceSettings('admin@x.com', { name: 'New Name', academicYear: '2027-28', contactEmail: '' });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/school-admin/workspace-settings'), expect.objectContaining({ method: 'PATCH' }));
    expect(result).toEqual(updated);
  });

  it('throws with the server error message on save failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'School name is required.' }) });
    await expect(saveWorkspaceSettings('admin@x.com', { name: '', academicYear: '', contactEmail: '' })).rejects.toThrow('School name is required.');
  });

  it('fetches the school logo url', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ schoolLogoUrl: 'https://x/logo.png' }) });
    const url = await fetchSchoolLogo('TSRA');
    expect(url).toBe('https://x/logo.png');
  });

  it('returns null when the logo fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({}) });
    const url = await fetchSchoolLogo('TSRA');
    expect(url).toBeNull();
  });

  it('uploads a logo and returns its url', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ logoUrl: 'https://x/new.png' }) });
    const url = await uploadSchoolLogo('TSRA', 'base64data', 'image/png');
    expect(url).toBe('https://x/new.png');
  });

  it('throws when the logo upload fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'Upload failed' }) });
    await expect(uploadSchoolLogo('TSRA', 'base64data', 'image/png')).rejects.toThrow('Upload failed');
  });
});
