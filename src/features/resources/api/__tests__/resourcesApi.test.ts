import { fetchResources, createFolder, addFile, deleteFolder, deleteFile, fmtSize, fmtWhen } from '../resourcesApi';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchResources', () => {
  test('builds the query string with just email when no folderId is given', async () => {
    const payload = { canManage: true, scopeLabel: null, breadcrumb: [], folders: [], files: [] };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload }) as any;

    const result = await fetchResources('admin@x.com');

    expect(result).toEqual(payload);
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('email=admin%40x.com');
    expect(url).not.toContain('folderId');
  });

  test('includes folderId in the query when given', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    await fetchResources('admin@x.com', 'folder1');
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('folderId=folder1');
  });

  test('a non-ok response throws the server error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'No access' }) }) as any;
    await expect(fetchResources('admin@x.com')).rejects.toThrow('No access');
  });

  test('a non-ok response with no parseable body falls back to a generic message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error('bad json'); } }) as any;
    await expect(fetchResources('admin@x.com')).rejects.toThrow('Failed to load resources');
  });
});

describe('createFolder', () => {
  test('POSTs the body and resolves on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    const body = { email: 'a@x.com', name: 'Handbooks', parentFolderId: null, scope: 'school' };

    await expect(createFolder(body)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/resources/folder'),
      expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    );
  });

  test('a non-ok response throws the server error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Folder already exists' }) }) as any;
    await expect(createFolder({ email: 'a@x.com', name: 'Handbooks' })).rejects.toThrow('Folder already exists');
  });

  test('a non-ok response with no parseable body falls back to a generic message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error('bad json'); } }) as any;
    await expect(createFolder({ email: 'a@x.com', name: 'Handbooks' })).rejects.toThrow('Failed to create folder');
  });
});

describe('addFile', () => {
  test('POSTs the body and resolves on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    const body = { email: 'a@x.com', folderId: 'f1', title: 'Doc.pdf', fileUrl: 'https://x/doc.pdf', fileType: 'pdf', fileSize: 100, scope: 'school' };

    await expect(addFile(body)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/resources/file'),
      expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    );
  });

  test('a non-ok response throws the server error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Upload rejected' }) }) as any;
    await expect(addFile({ email: 'a@x.com', title: 'Doc.pdf', fileUrl: 'x' })).rejects.toThrow('Upload rejected');
  });
});

describe('deleteFolder', () => {
  test('DELETEs with the id in the URL and resolves on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    await expect(deleteFolder('a@x.com', 'f1')).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/resources/folder/f1'),
      expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ email: 'a@x.com' }) })
    );
  });

  test('a non-ok response throws the server error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Not found' }) }) as any;
    await expect(deleteFolder('a@x.com', 'f1')).rejects.toThrow('Not found');
  });
});

describe('deleteFile', () => {
  test('DELETEs with the id in the URL and resolves on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    await expect(deleteFile('a@x.com', 'file1')).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/resources/file/file1'),
      expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ email: 'a@x.com' }) })
    );
  });

  test('a non-ok response throws the server error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Not found' }) }) as any;
    await expect(deleteFile('a@x.com', 'file1')).rejects.toThrow('Not found');
  });
});

describe('fmtSize', () => {
  test('zero/falsy bytes renders an em dash', () => {
    expect(fmtSize(0)).toBe('—');
  });

  test('sub-KB sizes render in bytes', () => {
    expect(fmtSize(512)).toBe('512 B');
  });

  test('sub-MB sizes render in whole KB', () => {
    expect(fmtSize(820 * 1024)).toBe('820 KB');
  });

  test('MB-and-up sizes render with 2 decimal places', () => {
    expect(fmtSize(13.55 * 1024 * 1024)).toBe('13.55 MB');
  });
});

describe('fmtWhen', () => {
  test('formats a morning ISO timestamp', () => {
    const iso = new Date(2026, 6, 16, 7, 4).toISOString();
    expect(fmtWhen(iso)).toBe('16 Jul 2026, 7:04 AM');
  });

  test('formats an afternoon ISO timestamp', () => {
    const iso = new Date(2026, 6, 16, 19, 4).toISOString();
    expect(fmtWhen(iso)).toBe('16 Jul 2026, 7:04 PM');
  });

  test('an invalid date string returns an empty string', () => {
    expect(fmtWhen('not-a-date')).toBe('');
  });
});
