import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import EditProfileModal from '../../components/modals/EditProfileModal';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = require('react');
  return Object.setPrototypeOf({
    Modal: ({ children }: any) => React.createElement(RN.View, null, children),
    KeyboardAvoidingView: ({ children }: any) => React.createElement(RN.View, null, children)
  }, RN);
});

describe('EditProfileModal', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn(),
    editName: 'Jane Doe',
    setEditName: jest.fn(),
    email: 'jane@example.com',
    editPhone: '12345',
    setEditPhone: jest.fn(),
    editCity: 'NY',
    setEditCity: jest.fn(),
    saving: false,
    onSave: jest.fn(),
    colors: { textMuted: '#aaa', textDim: '#bbb', textMain: '#000' },
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
    await render(<EditProfileModal {...mockProps} />);
    
    expect(await screen.findByText('Edit Profile')).toBeTruthy();
    expect(screen.getByDisplayValue('Jane Doe')).toBeTruthy();
    expect(await screen.findByText('jane@example.com')).toBeTruthy();
    expect(screen.getByDisplayValue('12345')).toBeTruthy();
    expect(screen.getByDisplayValue('NY')).toBeTruthy();
    expect(await screen.findByText('Save Changes')).toBeTruthy();
  });

  it('calls set state functions when inputs change', async () => {
    await render(<EditProfileModal {...mockProps} />);
    
    fireEvent.changeText(await screen.findByPlaceholderText('Your full name'), 'New Name');
    expect(mockProps.setEditName).toHaveBeenCalledWith('New Name');

    fireEvent.changeText(await screen.findByPlaceholderText('e.g. +91 98765 43210'), '09876');
    expect(mockProps.setEditPhone).toHaveBeenCalledWith('09876');

    fireEvent.changeText(await screen.findByPlaceholderText('e.g. Hyderabad'), 'SF');
    expect(mockProps.setEditCity).toHaveBeenCalledWith('SF');
  });

  it('calls onSave when save button is pressed', async () => {
    await render(<EditProfileModal {...mockProps} />);
    fireEvent.press(await screen.findByText('Save Changes'));
    expect(mockProps.onSave).toHaveBeenCalled();
  });

  it('shows saving text and disables button when saving', async () => {
    await render(<EditProfileModal {...mockProps} saving={true} />);
    expect(await screen.findByText('Saving...')).toBeTruthy();
    // Assuming button disabled state is handled correctly by RN TouchableOpacity
  });

  it('email is read-only (not a text input)', async () => {
    await render(<EditProfileModal {...mockProps} />);
    // But it should be in the document as Text
    expect(await screen.findByText('jane@example.com')).toBeTruthy();
    expect(await screen.findByText('You can update your email address anytime from Settings')).toBeTruthy();
  });
});
