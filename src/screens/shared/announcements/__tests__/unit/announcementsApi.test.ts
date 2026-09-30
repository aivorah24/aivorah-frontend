import {
  fetchActiveAnnouncements, fetchInbox, markSeen, dismissAnnouncement,
  adminListAnnouncements, adminListSchools, adminCreateAnnouncement,
  adminDraftAnnouncement, adminUpdateAnnouncement, adminPublishAnnouncement,
  adminArchiveAnnouncement, adminUploadAttachment,
} from '../../services/announcementsApi';

const ANNOUNCEMENT = { id: '1', title: 'Hi', body: 'Body', severity: 'info', displayType: 'both', status: 'published' };

describe('announcementsApi', () => {
  beforeEach(() => { global.fetch = jest.fn(); });

  it('fetchActiveAnnouncements returns the array on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [ANNOUNCEMENT] });
    const result = await fetchActiveAnnouncements('a@x.com', 'banner');
    expect(result).toEqual([ANNOUNCEMENT]);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('surface=banner'));
  });

  it('fetchActiveAnnouncements throws on a non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchActiveAnnouncements('a@x.com', 'banner')).rejects.toThrow('active fetch failed: 500');
  });

  it('fetchInbox returns the paginated page', async () => {
    const page = { items: [ANNOUNCEMENT], total: 1, page: 1, limit: 50 };
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => page });
    const result = await fetchInbox('a@x.com');
    expect(result).toEqual(page);
  });

  it('markSeen POSTs the id and userEmail', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    await markSeen('1', 'a@x.com');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/announcements/1/seen'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ userEmail: 'a@x.com' }) })
    );
  });

  it('dismissAnnouncement POSTs the id and userEmail', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    await dismissAnnouncement('1', 'a@x.com');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/announcements/1/dismiss'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('adminListAnnouncements returns the array', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [ANNOUNCEMENT] });
    const result = await adminListAnnouncements('admin@x.com');
    expect(result).toEqual([ANNOUNCEMENT]);
  });

  it('adminListAnnouncements throws with the server error on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'Not authorized' }) });
    await expect(adminListAnnouncements('admin@x.com')).rejects.toThrow('Not authorized');
  });

  it('adminListSchools returns the array', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [{ id: 's1', name: 'TSRA' }] });
    const result = await adminListSchools('admin@x.com');
    expect(result).toEqual([{ id: 's1', name: 'TSRA' }]);
  });

  it('adminCreateAnnouncement POSTs the draft with adminEmail merged in', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ANNOUNCEMENT });
    const draft = { title: 'Hi', body: 'Body', severity: 'info', displayType: 'both' };
    const result = await adminCreateAnnouncement('admin@x.com', draft);
    expect(result).toEqual(ANNOUNCEMENT);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/announcements/admin');
    expect(JSON.parse(init.body)).toEqual({ adminEmail: 'admin@x.com', ...draft });
  });

  it('adminCreateAnnouncement throws with the server error on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'title and body are required' }) });
    await expect(adminCreateAnnouncement('admin@x.com', {} as any)).rejects.toThrow('title and body are required');
  });

  it('adminDraftAnnouncement posts to the ai-draft endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ title: 'T', body: 'B' }) });
    const result = await adminDraftAnnouncement('admin@x.com', 'cricket reminder');
    expect(result).toEqual({ title: 'T', body: 'B' });
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/announcements/admin/ai-draft');
  });

  it('adminUpdateAnnouncement PATCHes the given id', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ANNOUNCEMENT });
    await adminUpdateAnnouncement('admin@x.com', '1', { title: 'New' });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/announcements/admin/1');
    expect(init.method).toBe('PATCH');
  });

  it('adminPublishAnnouncement posts to /publish', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ANNOUNCEMENT });
    await adminPublishAnnouncement('admin@x.com', '1');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/announcements/admin/1/publish');
  });

  it('adminArchiveAnnouncement posts to /archive', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ANNOUNCEMENT });
    await adminArchiveAnnouncement('admin@x.com', '1');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/announcements/admin/1/archive');
  });

  it('adminUploadAttachment posts multipart form data and returns the result', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ url: 'https://x/f.pdf', name: 'f.pdf', type: 'pdf', size: 100 }) });
    const file = new File(['x'], 'f.pdf', { type: 'application/pdf' });
    const result = await adminUploadAttachment('admin@x.com', file);
    expect(result.url).toBe('https://x/f.pdf');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/announcements/admin/upload');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('adminUploadAttachment throws on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'Upload failed' }) });
    const file = new File(['x'], 'f.pdf', { type: 'application/pdf' });
    await expect(adminUploadAttachment('admin@x.com', file)).rejects.toThrow('Upload failed');
  });
});
