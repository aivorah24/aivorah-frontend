import { fileIcon, filterFolders, filterFiles } from '../../utils/resourcesFilter';
import { ResourceFolder, ResourceFile } from '../../services/resourcesApi';

describe('fileIcon', () => {
  test('a pdf gets the file-text icon in red', () => {
    expect(fileIcon('pdf')).toEqual({ name: 'file-text', color: '#C0392B' });
  });

  test('image types get the image icon in green', () => {
    for (const t of ['png', 'jpg', 'jpeg', 'gif', 'webp']) {
      expect(fileIcon(t)).toEqual({ name: 'image', color: '#2E7D5B' });
    }
  });

  test('an unrecognized type falls back to the generic file icon', () => {
    expect(fileIcon('docx')).toEqual({ name: 'file', color: '#6E6A60' });
  });

  test('null type falls back to the generic file icon', () => {
    expect(fileIcon(null)).toEqual({ name: 'file', color: '#6E6A60' });
  });

  test('type matching is case-insensitive', () => {
    expect(fileIcon('PDF')).toEqual({ name: 'file-text', color: '#C0392B' });
    expect(fileIcon('JPG')).toEqual({ name: 'image', color: '#2E7D5B' });
  });
});

const FOLDER_A: ResourceFolder = { id: 'f1', name: 'Handbooks', scope: 'school', author: 'Admin', updatedAt: '2026-01-01T00:00:00Z' };
const FOLDER_B: ResourceFolder = { id: 'f2', name: 'Policies', scope: 'school', author: 'Admin', updatedAt: '2026-01-02T00:00:00Z' };
const FILE_A: ResourceFile = { id: 'file1', title: 'Attendance Policy.pdf', fileUrl: 'x', fileType: 'pdf', fileSize: 100, scope: 'school', author: 'Admin', updatedAt: '2026-01-01T00:00:00Z' };
const FILE_B: ResourceFile = { id: 'file2', title: 'Uniform Guide.png', fileUrl: 'x', fileType: 'png', fileSize: 200, scope: 'school', author: 'Admin', updatedAt: '2026-01-02T00:00:00Z' };

describe('filterFolders', () => {
  test('an empty search returns every folder unfiltered', () => {
    expect(filterFolders([FOLDER_A, FOLDER_B], '')).toEqual([FOLDER_A, FOLDER_B]);
  });

  test('a matching search narrows to folders whose name contains it', () => {
    expect(filterFolders([FOLDER_A, FOLDER_B], 'hand')).toEqual([FOLDER_A]);
  });

  test('search is case-insensitive', () => {
    expect(filterFolders([FOLDER_A, FOLDER_B], 'POLICIES')).toEqual([FOLDER_B]);
  });

  test('whitespace-only search behaves like an empty search', () => {
    expect(filterFolders([FOLDER_A, FOLDER_B], '   ')).toEqual([FOLDER_A, FOLDER_B]);
  });

  test('no match returns an empty list', () => {
    expect(filterFolders([FOLDER_A, FOLDER_B], 'zzz')).toEqual([]);
  });
});

describe('filterFiles', () => {
  test('an empty search returns every file unfiltered', () => {
    expect(filterFiles([FILE_A, FILE_B], '')).toEqual([FILE_A, FILE_B]);
  });

  test('a matching search narrows to files whose title contains it', () => {
    expect(filterFiles([FILE_A, FILE_B], 'attendance')).toEqual([FILE_A]);
  });

  test('search is case-insensitive', () => {
    expect(filterFiles([FILE_A, FILE_B], 'UNIFORM')).toEqual([FILE_B]);
  });

  test('no match returns an empty list', () => {
    expect(filterFiles([FILE_A, FILE_B], 'zzz')).toEqual([]);
  });
});
