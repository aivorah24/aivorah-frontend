import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useProfilePhoto } from '../useProfilePhoto';

jest.setTimeout(15000);
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockRequestPermissions = jest.fn();
const mockLaunchLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...args: any[]) => mockRequestPermissions(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchLibrary(...args),
  MediaTypeOptions: { Images: 'Images' },
}));

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const mockUpdateUser = jest.fn();

function Harness({ userEmail = 'a@a.com' }: { userEmail?: string }) {
  const h = useProfilePhoto(userEmail, null, mockUpdateUser);
  return (
    <>
      <Text testID="photoUrl">{h.photoUrl ?? ''}</Text>
      <Text testID="uploading">{String(h.uploading)}</Text>
      <TouchableOpacity testID="pickPhoto" onPress={() => h.handlePickPhoto()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestPermissions.mockResolvedValue({ status: 'granted' });
  mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: [{ base64: 'abc123', mimeType: 'image/png' }] });
  global.fetch = jest.fn().mockResolvedValue(jsonRes({ photoUrl: 'https://cdn/a.png' })) as any;
});

describe('useProfilePhoto — permission handling', () => {
  test('a real denied permission shows a real alert and never opens the picker', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('pickPhoto'));

    expect(Alert.alert).toHaveBeenCalledWith('Permission needed', 'Allow access to your photo library.');
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
  });

  test('does nothing at all with no real userEmail', async () => {
    const user = userEvent.setup();
    await render(<Harness userEmail={'' as any} />);

    await user.press(screen.getByTestId('pickPhoto'));

    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });
});

describe('useProfilePhoto — picking', () => {
  test('a real cancelled picker leaves everything unchanged', async () => {
    mockLaunchLibrary.mockResolvedValue({ canceled: true });
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('pickPhoto'));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('photoUrl').props.children).toBe('');
  });

  test('a real successful upload sets the real returned photoUrl and updates the user', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('pickPhoto'));

    await waitFor(() => expect(screen.getByTestId('photoUrl').props.children).toBe('https://cdn/a.png'));
    expect(mockUpdateUser).toHaveBeenCalledWith({ photoUrl: 'https://cdn/a.png' });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/user/upload-photo'), expect.objectContaining({
      body: JSON.stringify({ userEmail: 'a@a.com', base64: 'abc123', mimeType: 'image/png' }),
    }));
  });

  test('a real server response with no url shows a real upload-failed alert', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ error: 'Storage full' })) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('pickPhoto'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Upload failed', 'Storage full'));
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test('a real network failure during upload shows a real friendly alert', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('pickPhoto'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Upload failed', 'Could not upload photo. Please try again.'));
  });

  test('uploading flag is real true during the request and false again after', async () => {
    let resolveFetch: (v: any) => void;
    global.fetch = jest.fn(() => new Promise(r => { resolveFetch = r; })) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    const pressPromise = user.press(screen.getByTestId('pickPhoto'));
    await waitFor(() => expect(screen.getByTestId('uploading').props.children).toBe('true'));

    resolveFetch!(jsonRes({ photoUrl: 'https://cdn/a.png' }));
    await pressPromise;

    await waitFor(() => expect(screen.getByTestId('uploading').props.children).toBe('false'));
  });
});
