import { fetchResources, createFolder, addFile, deleteFolder, deleteFile, fmtSize, fmtWhen } from '../../services/resourcesApi';
import { trRequest } from '../../../../../services/timetableResourcesClient';

jest.mock('../../../../../services/timetableResourcesClient', () => ({ trRequest: jest.fn() }));
const mockRequest = trRequest as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({});
});

describe('resources requests (no email sent; the server uses the sign-in)', () => {
  test('fetchResources at the library root', async () => {
    await fetchResources();
    expect(mockRequest).toHaveBeenCalledWith('/resources', {}, 'Failed to load resources');
  });

  test('fetchResources inside a folder', async () => {
    await fetchResources('f 1');
    expect(mockRequest.mock.calls[0][0]).toBe('/resources?folderId=f+1');
  });

  test('createFolder POSTs', async () => {
    const body = { name: 'Policies', parentFolderId: null, scope: 'school' };
    await createFolder(body);
    expect(mockRequest).toHaveBeenCalledWith('/resources/folder', { method: 'POST', body }, 'Failed to create folder');
  });

  test('addFile POSTs', async () => {
    const body = { folderId: 'f1', title: 'Doc.pdf', fileUrl: 'https://x/doc.pdf' };
    await addFile(body);
    expect(mockRequest).toHaveBeenCalledWith('/resources/file', { method: 'POST', body }, 'Failed to add file');
  });

  test('deleteFolder and deleteFile encode the id', async () => {
    await deleteFolder('a/b');
    await deleteFile('c d');
    expect(mockRequest).toHaveBeenNthCalledWith(1, '/resources/folder/a%2Fb', { method: 'DELETE' }, 'Failed to delete folder');
    expect(mockRequest).toHaveBeenNthCalledWith(2, '/resources/file/c%20d', { method: 'DELETE' }, 'Failed to delete file');
  });

  test('errors from the client reach the caller', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Only teachers and school admins can manage resources'));
    await expect(createFolder({ name: 'X' })).rejects.toThrow('Only teachers and school admins can manage resources');
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
