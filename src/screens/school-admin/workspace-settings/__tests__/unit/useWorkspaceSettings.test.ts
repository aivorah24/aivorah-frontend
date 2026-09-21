import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings';
import * as service from '../../services/workspaceSettingsService';

jest.mock('../../services/workspaceSettingsService', () => ({
  __esModule: true,
  fetchWorkspaceOverview: jest.fn(),
  saveWorkspaceSettings: jest.fn(),
  fetchSchoolLogo: jest.fn(),
  uploadSchoolLogo: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []),
}));

const mocked = service as jest.Mocked<typeof service>;
const SCHOOL = { id: '1', name: 'TSRA', academicYear: '2026-27', contactEmail: 'office@tsra.edu' };

describe('useWorkspaceSettings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the school overview and logo on focus', async () => {
    mocked.fetchWorkspaceOverview.mockResolvedValue(SCHOOL);
    mocked.fetchSchoolLogo.mockResolvedValue('https://x/logo.png');
    const { result } = await renderHook(() => useWorkspaceSettings('admin@x.com'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.school).toEqual(SCHOOL);
    expect(result.current.logoUrl).toBe('https://x/logo.png');
  });

  it('starts edit with the current school prefilled into draft', async () => {
    mocked.fetchWorkspaceOverview.mockResolvedValue(SCHOOL);
    mocked.fetchSchoolLogo.mockResolvedValue(null);
    const { result } = await renderHook(() => useWorkspaceSettings('admin@x.com'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.startEdit());
    expect(result.current.editing).toBe(true);
    expect(result.current.draft).toEqual({ name: SCHOOL.name, academicYear: SCHOOL.academicYear, contactEmail: SCHOOL.contactEmail });
  });

  it('rejects an empty school name without calling save', async () => {
    mocked.fetchWorkspaceOverview.mockResolvedValue(SCHOOL);
    mocked.fetchSchoolLogo.mockResolvedValue(null);
    const { result } = await renderHook(() => useWorkspaceSettings('admin@x.com'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.startEdit());
    await act(async () => result.current.setDraftField('name', '  '));
    await act(async () => { await result.current.save(); });

    expect(result.current.saveError).toBe('School name cannot be empty.');
    expect(mocked.saveWorkspaceSettings).not.toHaveBeenCalled();
  });

  it('rejects an invalid contact email without calling save', async () => {
    mocked.fetchWorkspaceOverview.mockResolvedValue(SCHOOL);
    mocked.fetchSchoolLogo.mockResolvedValue(null);
    const { result } = await renderHook(() => useWorkspaceSettings('admin@x.com'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.startEdit());
    await act(async () => result.current.setDraftField('contactEmail', 'not-an-email'));
    await act(async () => { await result.current.save(); });

    expect(result.current.saveError).toBe('Enter a valid contact email, or leave it blank.');
    expect(mocked.saveWorkspaceSettings).not.toHaveBeenCalled();
  });

  it('saves valid changes and exits edit mode', async () => {
    mocked.fetchWorkspaceOverview.mockResolvedValue(SCHOOL);
    mocked.fetchSchoolLogo.mockResolvedValue(null);
    const updated = { ...SCHOOL, name: 'New Name' };
    mocked.saveWorkspaceSettings.mockResolvedValue(updated);
    const { result } = await renderHook(() => useWorkspaceSettings('admin@x.com'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.startEdit());
    await act(async () => result.current.setDraftField('name', 'New Name'));
    await act(async () => { await result.current.save(); });

    expect(result.current.school).toEqual(updated);
    expect(result.current.editing).toBe(false);
  });

  it('surfaces the server error on a failed save', async () => {
    mocked.fetchWorkspaceOverview.mockResolvedValue(SCHOOL);
    mocked.fetchSchoolLogo.mockResolvedValue(null);
    mocked.saveWorkspaceSettings.mockRejectedValue(new Error('boom'));
    const { result } = await renderHook(() => useWorkspaceSettings('admin@x.com'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.startEdit());
    await act(async () => { await result.current.save(); });

    expect(result.current.saveError).toBe('boom');
    expect(result.current.editing).toBe(true);
  });

  it('cancelEdit exits edit mode and clears the error', async () => {
    mocked.fetchWorkspaceOverview.mockResolvedValue(SCHOOL);
    mocked.fetchSchoolLogo.mockResolvedValue(null);
    const { result } = await renderHook(() => useWorkspaceSettings('admin@x.com'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.startEdit());
    await act(async () => result.current.cancelEdit());

    expect(result.current.editing).toBe(false);
    expect(result.current.saveError).toBe('');
  });

  it('uploadLogo updates logoUrl on success', async () => {
    mocked.fetchWorkspaceOverview.mockResolvedValue(SCHOOL);
    mocked.fetchSchoolLogo.mockResolvedValue(null);
    mocked.uploadSchoolLogo.mockResolvedValue('https://x/new.png');
    const { result } = await renderHook(() => useWorkspaceSettings('admin@x.com'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.uploadLogo('base64', 'image/png'); });

    expect(result.current.logoUrl).toBe('https://x/new.png');
    expect(mocked.uploadSchoolLogo).toHaveBeenCalledWith('TSRA', 'base64', 'image/png');
  });
});
