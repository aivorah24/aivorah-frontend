import React from 'react';
import { Platform, Alert } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useResourcesState } from '../../hooks/useResourcesState';
import { fetchResources, createFolder, addFile, deleteFolder, deleteFile } from '../../services/resourcesApi';
import { trUpload } from '../../../../../services/timetableResourcesClient';

jest.mock('../../../../../services/timetableResourcesClient', () => ({ trUpload: jest.fn() }));
const mockUpload = trUpload as jest.Mock;

jest.mock('../../services/resourcesApi', () => ({
  fetchResources: jest.fn(), createFolder: jest.fn(), addFile: jest.fn(), deleteFolder: jest.fn(), deleteFile: jest.fn(),
}));

const mockFetchResources = fetchResources as jest.Mock;
const mockCreateFolder = createFolder as jest.Mock;
const mockAddFile = addFile as jest.Mock;
const mockDeleteFolder = deleteFolder as jest.Mock;
const mockDeleteFile = deleteFile as jest.Mock;

const RESPONSE = {
  canManage: true, scopeLabel: null, breadcrumb: [],
  folders: [{ id: 'f1', name: 'Handbooks', scope: 'school', author: 'Admin', updatedAt: '2026-01-01T00:00:00Z' }],
  files: [{ id: 'file1', title: 'Doc.pdf', fileUrl: 'https://x/doc.pdf', fileType: 'pdf', fileSize: 100, scope: 'school', author: 'Admin', updatedAt: '2026-01-01T00:00:00Z' }],
};

let hookRef: ReturnType<typeof useResourcesState>;

function Harness() {
  const h = useResourcesState();
  React.useEffect(() => { hookRef = h; });
  return <Text testID="loading">{String(h.loading)}</Text>;
}

async function renderHarness() {
  render(<Harness />);
  await waitFor(() => expect(hookRef).toBeDefined());
}

describe('useResourcesState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'web';
  });

  test('load populates data on success', async () => {
    mockFetchResources.mockResolvedValue(RESPONSE);
    await renderHarness();

    await act(async () => hookRef.load(null));

    expect(hookRef.data).toEqual(RESPONSE);
    expect(hookRef.loading).toBe(false);
    expect(hookRef.error).toBe('');
  });

  test('load failure surfaces the error and clears data', async () => {
    mockFetchResources.mockRejectedValue(new Error('Failed to load resources'));
    await renderHarness();

    await act(async () => hookRef.load(null));

    expect(hookRef.error).toBe('Failed to load resources');
    expect(hookRef.data).toBeNull();
    expect(hookRef.loading).toBe(false);
  });

  test('openFolder resets search and sets folderId', async () => {
    await renderHarness();
    await act(async () => hookRef.setSearch('hand'));
    await act(async () => hookRef.openFolder('f1'));
    expect(hookRef.folderId).toBe('f1');
    expect(hookRef.search).toBe('');
  });

  test('goCrumb resets search and sets folderId (including back to root/null)', async () => {
    await renderHarness();
    await act(async () => hookRef.openFolder('f1'));
    await act(async () => hookRef.setSearch('doc'));
    await act(async () => hookRef.goCrumb(null));
    expect(hookRef.folderId).toBeNull();
    expect(hookRef.search).toBe('');
  });

  test('openFile sets viewerDoc when the file has a URL', async () => {
    await renderHarness();
    await act(async () => hookRef.openFile(RESPONSE.files[0]));
    expect(hookRef.viewerDoc).toEqual({ title: 'Doc.pdf', fileUrl: 'https://x/doc.pdf', fileType: 'pdf' });
  });

  test('openFile does nothing for a file with no URL', async () => {
    await renderHarness();
    await act(async () => hookRef.openFile({ ...RESPONSE.files[0], fileUrl: '' }));
    expect(hookRef.viewerDoc).toBeNull();
  });

  test('submitNewFolder does nothing for a blank/whitespace-only name', async () => {
    await renderHarness();
    await act(async () => hookRef.setNewFolderName('   '));
    await act(async () => hookRef.submitNewFolder());
    expect(mockCreateFolder).not.toHaveBeenCalled();
  });

  test('submitNewFolder success trims the name, closes the modal, and reloads', async () => {
    mockCreateFolder.mockResolvedValue(undefined);
    mockFetchResources.mockResolvedValue(RESPONSE);
    await renderHarness();
    await act(async () => hookRef.setShowNewFolder(true));
    await act(async () => hookRef.setNewFolderName('  Handbooks  '));

    await act(async () => hookRef.submitNewFolder());

    expect(mockCreateFolder).toHaveBeenCalledWith(expect.objectContaining({ name: 'Handbooks', parentFolderId: null, scope: 'school' }));
    expect(hookRef.showNewFolder).toBe(false);
    expect(hookRef.newFolderName).toBe('');
    expect(mockFetchResources).toHaveBeenCalled();
  });

  test('submitNewFolder failure surfaces the error and keeps the modal open', async () => {
    mockCreateFolder.mockRejectedValue(new Error('Folder already exists'));
    await renderHarness();
    await act(async () => hookRef.setShowNewFolder(true));
    await act(async () => hookRef.setNewFolderName('Handbooks'));

    await act(async () => hookRef.submitNewFolder());

    expect(hookRef.error).toBe('Folder already exists');
    expect(hookRef.showNewFolder).toBe(true);
  });

  test('uploadFile off the web platform shows a native Alert and never touches fetch/document', async () => {
    Platform.OS = 'ios';
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderHarness();

    hookRef.uploadFile();

    expect(alertSpy).toHaveBeenCalledWith('Upload', 'Please upload files from the web app.');
    alertSpy.mockRestore();
  });

  test('uploadFile on web creates a file input, uploads the selected file, and reloads', async () => {
    mockAddFile.mockResolvedValue(undefined);
    mockFetchResources.mockResolvedValue(RESPONSE);
    mockUpload.mockResolvedValue({ url: 'https://cdn/doc.pdf', name: 'Doc.pdf', type: 'pdf', size: 500 });

    const fakeInput: any = { type: '', accept: '', onchange: null, files: null, click: jest.fn() };
    (global as any).document = { createElement: jest.fn().mockReturnValue(fakeInput) };
    await renderHarness();

    hookRef.uploadFile();
    expect(fakeInput.click).toHaveBeenCalled();

    fakeInput.files = [{ name: 'Doc.pdf', size: 500 }];
    await act(async () => fakeInput.onchange());

    expect(mockUpload).toHaveBeenCalledWith(fakeInput.files[0], 'Doc.pdf');
    expect(mockAddFile).toHaveBeenCalledWith(expect.objectContaining({ title: 'Doc.pdf', fileUrl: 'https://cdn/doc.pdf', fileType: 'pdf' }));
    expect(mockFetchResources).toHaveBeenCalled();
    delete (global as any).document;
  });

  test('uploadFile on web rejects a file over 25 MB before uploading', async () => {
    const fakeInput: any = { type: '', accept: '', onchange: null, files: null, click: jest.fn() };
    (global as any).document = { createElement: jest.fn().mockReturnValue(fakeInput) };
    await renderHarness();

    hookRef.uploadFile();
    fakeInput.files = [{ name: 'Huge.pdf', size: 26 * 1024 * 1024 }];
    await act(async () => fakeInput.onchange());

    expect(hookRef.error).toBe('Files must be under 25 MB.');
    expect(mockUpload).not.toHaveBeenCalled();
    delete (global as any).document;
  });

  test('confirmDeleteFolder on web uses window.confirm and deletes only when confirmed', async () => {
    mockDeleteFolder.mockResolvedValue(undefined);
    mockFetchResources.mockResolvedValue(RESPONSE);
    const confirmMock = jest.fn().mockReturnValue(true);
    (global as any).window = { confirm: confirmMock };
    await renderHarness();

    await act(async () => hookRef.confirmDeleteFolder(RESPONSE.folders[0]));

    expect(confirmMock).toHaveBeenCalledWith('Delete folder "Handbooks" and everything inside it?');
    expect(mockDeleteFolder).toHaveBeenCalledWith('f1');
    delete (global as any).window;
  });

  test('confirmDeleteFolder on web does nothing when the confirm is dismissed', async () => {
    (global as any).window = { confirm: jest.fn().mockReturnValue(false) };
    await renderHarness();

    await act(async () => hookRef.confirmDeleteFolder(RESPONSE.folders[0]));

    expect(mockDeleteFolder).not.toHaveBeenCalled();
    delete (global as any).window;
  });

  test('confirmDeleteFile off the web platform uses a native Alert with a destructive Delete action', async () => {
    Platform.OS = 'ios';
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderHarness();

    hookRef.confirmDeleteFile(RESPONSE.files[0]);

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete file', 'Delete "Doc.pdf"?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ]),
    );
    alertSpy.mockRestore();
  });

  test('confirmDeleteFile\'s native Delete action calls deleteFile when invoked', async () => {
    Platform.OS = 'ios';
    mockDeleteFile.mockResolvedValue(undefined);
    mockFetchResources.mockResolvedValue(RESPONSE);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons?: any) => {
      buttons?.find((b: any) => b.text === 'Delete')?.onPress?.();
    });
    await renderHarness();

    await act(async () => hookRef.confirmDeleteFile(RESPONSE.files[0]));

    expect(mockDeleteFile).toHaveBeenCalledWith('file1');
    alertSpy.mockRestore();
  });
});
