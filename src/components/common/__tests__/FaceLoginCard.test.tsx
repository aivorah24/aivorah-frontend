// Face login card in Settings ("manage") and after sign-up ("setup").
import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import FaceLoginCard from '../FaceLoginCard';
import * as face from '../../../services/faceLogin';

jest.mock('../../../services/faceLogin', () => ({
  faceLoginAvailable: jest.fn(),
  addFaceLogin: jest.fn(),
  listFaceLogins: jest.fn(),
  removeFaceLogin: jest.fn(),
  rememberFaceLoginOffer: jest.fn(),
  faceLoginErrorMessage: (e: any) => (e?.name === 'NotAllowedError' ? 'Face login was cancelled or timed out. Please try again.' : e?.message),
}));
const mocked = face as jest.Mocked<typeof face>;
const colors = { cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#aaa', accentYellow: '#D9A93E', accentRed: '#C98A8A' };
const DEVICE = { id: 'p1', deviceLabel: 'Windows · Chrome', createdAt: '2026-11-07T10:00:00Z', lastUsedAt: null };

beforeEach(() => {
  jest.clearAllMocks();
  mocked.faceLoginAvailable.mockResolvedValue(true);
  mocked.listFaceLogins.mockResolvedValue([]);
});

test('hidden where the device cannot do face login', async () => {
  mocked.faceLoginAvailable.mockResolvedValue(false);
  await render(<FaceLoginCard colors={colors} />);
  await act(async () => {});
  expect(screen.queryByTestId('face-login-card')).toBeNull();
});

test('Settings: add face login on this device, then it is listed', async () => {
  mocked.addFaceLogin.mockResolvedValue();
  await render(<FaceLoginCard colors={colors} />);
  await screen.findByTestId('face-login-card');
  mocked.listFaceLogins.mockResolvedValue([DEVICE]);
  await act(async () => { fireEvent.press(screen.getByTestId('face-login-add')); });
  expect(mocked.addFaceLogin).toHaveBeenCalled();
  expect(await screen.findByText('Windows · Chrome')).toBeTruthy();
  expect(screen.getByText('Face login is on for this device.')).toBeTruthy();
});

test('Settings: shows where it is on, and Remove turns it off there', async () => {
  mocked.listFaceLogins.mockResolvedValueOnce([DEVICE]).mockResolvedValue([]);
  mocked.removeFaceLogin.mockResolvedValue();
  await render(<FaceLoginCard colors={colors} />);
  expect(await screen.findByText('Added 7 Nov 2026')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('Remove')); });
  expect(mocked.removeFaceLogin).toHaveBeenCalledWith('p1');
  await waitFor(() => expect(screen.queryByText('Windows · Chrome')).toBeNull());
});

test('a cancelled face prompt shows a friendly message', async () => {
  mocked.addFaceLogin.mockRejectedValue({ name: 'NotAllowedError' });
  await render(<FaceLoginCard colors={colors} />);
  await screen.findByTestId('face-login-card');
  await act(async () => { fireEvent.press(screen.getByTestId('face-login-add')); });
  expect(await screen.findByText('Face login was cancelled or timed out. Please try again.')).toBeTruthy();
});

test('after sign-up: Set up face login or Not now; both finish', async () => {
  const onDone = jest.fn();
  mocked.addFaceLogin.mockResolvedValue();
  await render(<FaceLoginCard colors={colors} variant="setup" onDone={onDone} />);
  expect(await screen.findByText('Add face login? (optional)')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('Set up face login')); });
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(mocked.rememberFaceLoginOffer).toHaveBeenCalledWith(false);

  await act(async () => { fireEvent.press(screen.getByTestId('face-login-skip')); });
  expect(onDone).toHaveBeenCalledTimes(2);
  expect(mocked.listFaceLogins).not.toHaveBeenCalled(); // setup does not list
});
