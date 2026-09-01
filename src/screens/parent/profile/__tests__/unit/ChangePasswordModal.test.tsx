import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import ChangePasswordModal from '../../components/modals/ChangePasswordModal';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = require('react');
  return Object.setPrototypeOf({
    Modal: ({ children }: any) => React.createElement(RN.View, null, children),
    KeyboardAvoidingView: ({ children }: any) => React.createElement(RN.View, null, children)
  }, RN);
});

describe('ChangePasswordModal', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn(),
    currentPass: '',
    setCurrentPass: jest.fn(),
    newPass: '',
    setNewPass: jest.fn(),
    confirmPass: '',
    setConfirmPass: jest.fn(),
    passError: '',
    passSuccess: false,
    passLoading: false,
    onSubmit: jest.fn(),
    colors: { textMuted: '#aaa', textDim: '#bbb', textMain: '#000', accentGreen: '#0f0' },
    s: {
      modalOverlay: {},
      modalCard: {},
      modalHeader: {},
      modalTitle: {},
      modalLabel: {},
      modalInput: {},
      saveBtn: {},
      saveBtnText: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', async () => {
    await render(<ChangePasswordModal {...mockProps} />);
    expect(await screen.findByText('Change Password')).toBeTruthy();
    expect(await screen.findByText('Current Password')).toBeTruthy();
    expect(await screen.findByText('New Password')).toBeTruthy();
    expect(await screen.findByText('Confirm New Password')).toBeTruthy();
    expect(await screen.findByText('Update Password')).toBeTruthy();
  });

  it('calls change handlers on text input', async () => {
    await render(<ChangePasswordModal {...mockProps} />);
    
    fireEvent.changeText(await screen.findByPlaceholderText('Enter current password'), 'old123');
    expect(mockProps.setCurrentPass).toHaveBeenCalledWith('old123');

    fireEvent.changeText(await screen.findByPlaceholderText('At least 6 characters'), 'new123');
    expect(mockProps.setNewPass).toHaveBeenCalledWith('new123');

    fireEvent.changeText(await screen.findByPlaceholderText('Re-enter new password'), 'new123');
    expect(mockProps.setConfirmPass).toHaveBeenCalledWith('new123');
  });

  it('displays error message if passError is provided', async () => {
    await render(<ChangePasswordModal {...mockProps} passError="Passwords do not match." />);
    expect(await screen.findByText('Passwords do not match.')).toBeTruthy();
  });

  it('shows success UI when passSuccess is true', async () => {
    await render(<ChangePasswordModal {...mockProps} passSuccess={true} />);
    expect(await screen.findByText('Password Updated!')).toBeTruthy();
    expect(screen.queryByText('Update Password')).toBeNull(); // Form should be hidden
  });

  it('shows loading state on submit button', async () => {
    await render(<ChangePasswordModal {...mockProps} passLoading={true} />);
    expect(await screen.findByText('Updating...')).toBeTruthy();
  });

  it('calls onSubmit when submit button is pressed', async () => {
    await render(<ChangePasswordModal {...mockProps} />);
    fireEvent.press(await screen.findByText('Update Password'));
    expect(mockProps.onSubmit).toHaveBeenCalled();
  });
});
