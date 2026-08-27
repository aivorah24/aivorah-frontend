// Standalone unit test for useBrandingLogos — school/curriculum logo upload,
// reused across every worksheet for that school/curriculum.
import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useBrandingLogos } from '../../hooks/useBrandingLogos';

jest.setTimeout(15000);
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockRequestPermissions = jest.fn();
const mockLaunchLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...args: any[]) => mockRequestPermissions(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchLibrary(...args),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockFetchBrandingLogos = jest.fn();
const mockUploadBrandingLogo = jest.fn();
jest.mock('../../services/settingsService', () => ({
  fetchBrandingLogos: (...args: any[]) => mockFetchBrandingLogos(...args),
  uploadBrandingLogo: (...args: any[]) => mockUploadBrandingLogo(...args),
}));

function Harness({ school, curriculum }: { school?: string; curriculum?: string }) {
  const h = useBrandingLogos(school, curriculum);
  return (
    <>
      <Text testID="schoolLogoUrl">{h.schoolLogoUrl ?? ''}</Text>
      <Text testID="curriculumLogoUrl">{h.curriculumLogoUrl ?? ''}</Text>
      <Text testID="uploadingLogo">{String(h.uploadingLogo)}</Text>
      <TouchableOpacity testID="pickSchoolLogo" onPress={() => h.handlePickLogo('school')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="pickCurriculumLogo" onPress={() => h.handlePickLogo('curriculum')}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestPermissions.mockResolvedValue({ status: 'granted' });
  mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc123', mimeType: 'image/png' }] });
  mockFetchBrandingLogos.mockResolvedValue({});
});

describe('useBrandingLogos — loading existing logos', () => {
  test('with no real school and no real curriculum, never fetches', async () => {
    await render(<Harness />);
    expect(mockFetchBrandingLogos).not.toHaveBeenCalled();
  });

  test('a real school/curriculum fetches and populates both real logo URLs', async () => {
    mockFetchBrandingLogos.mockResolvedValue({ schoolLogoUrl: 'https://cdn/school.png', curriculumLogoUrl: 'https://cdn/curriculum.png' });
    await render(<Harness school="Riverdale High" curriculum="IB PYP" />);

    await waitFor(() => expect(screen.getByTestId('schoolLogoUrl').props.children).toBe('https://cdn/school.png'));
    expect(screen.getByTestId('curriculumLogoUrl').props.children).toBe('https://cdn/curriculum.png');
    expect(mockFetchBrandingLogos).toHaveBeenCalledWith('Riverdale High', 'IB PYP');
  });
});

describe('useBrandingLogos — uploading', () => {
  test('picking a school logo with no real school set shows a real setup alert, never opens the picker', async () => {
    const user = userEvent.setup();
    await render(<Harness curriculum="IB PYP" />);

    await user.press(screen.getByTestId('pickSchoolLogo'));

    expect(Alert.alert).toHaveBeenCalledWith('Set your school first', 'Add your school in Profile & Account before uploading its logo.');
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
  });

  test('a real successful school logo upload sets schoolLogoUrl only, not curriculumLogoUrl', async () => {
    mockUploadBrandingLogo.mockResolvedValue({ logoUrl: 'https://cdn/new-school.png' });
    const user = userEvent.setup();
    await render(<Harness school="Riverdale High" curriculum="IB PYP" />);

    await user.press(screen.getByTestId('pickSchoolLogo'));

    await waitFor(() => expect(screen.getByTestId('schoolLogoUrl').props.children).toBe('https://cdn/new-school.png'));
    expect(screen.getByTestId('curriculumLogoUrl').props.children).toBe('');
    expect(mockUploadBrandingLogo).toHaveBeenCalledWith('school', 'Riverdale High', 'abc123', 'image/png');
  });

  test('a real successful curriculum logo upload sets curriculumLogoUrl only', async () => {
    mockUploadBrandingLogo.mockResolvedValue({ logoUrl: 'https://cdn/new-curriculum.png' });
    const user = userEvent.setup();
    await render(<Harness school="Riverdale High" curriculum="IB PYP" />);

    await user.press(screen.getByTestId('pickCurriculumLogo'));

    await waitFor(() => expect(screen.getByTestId('curriculumLogoUrl').props.children).toBe('https://cdn/new-curriculum.png'));
    expect(screen.getByTestId('schoolLogoUrl').props.children).toBe('');
  });

  test('a real server response with no logoUrl shows a real upload-failed alert', async () => {
    mockUploadBrandingLogo.mockResolvedValue({ error: 'Bad image format' });
    const user = userEvent.setup();
    await render(<Harness school="Riverdale High" />);

    await user.press(screen.getByTestId('pickSchoolLogo'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Upload failed', 'Bad image format'));
  });

  test('uploadingLogo tracks which kind is in flight, then clears', async () => {
    let resolveUpload: (v: any) => void;
    mockUploadBrandingLogo.mockReturnValue(new Promise(r => { resolveUpload = r; }));
    const user = userEvent.setup();
    await render(<Harness school="Riverdale High" />);

    const pressPromise = user.press(screen.getByTestId('pickSchoolLogo'));
    await waitFor(() => expect(screen.getByTestId('uploadingLogo').props.children).toBe('school'));

    resolveUpload!({ logoUrl: 'https://cdn/x.png' });
    await pressPromise;

    await waitFor(() => expect(screen.getByTestId('uploadingLogo').props.children).toBe('null'));
  });
});
