import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { StudentDetailDrawer } from '../StudentDetailDrawer';
import type { StudentDetail } from '../../services/schoolAdminStudentsService';

const colors = {
  accentYellow: '#BAA467', textHeading: '#F5F3EE', textDim: '#6E736B', cardDark: '#141414',
  borderColor: 'rgba(245,243,238,0.14)', textMain: '#F5F3EE', textMuted: '#A9B0AC',
  accentRed: '#C98A8A', bgDark: '#0B0B0B',
} as any;

const DETAIL: StudentDetail = {
  id: 'st1', name: 'Aarav Sharma', email: 'aarav@school.test', admissionNumber: 'ADM-001',
  grade: 'Grade 6', section: 'A', status: 'active', joinedAt: '2024-09-01T00:00:00.000Z',
  lastActiveAt: '2024-09-15T10:30:00.000Z',
  parent: { name: 'Mr. Sharma', email: 'parent.sharma@school.test', phone: '+91 98765 43210' },
};

function baseProps(overrides: Partial<React.ComponentProps<typeof StudentDetailDrawer>> = {}) {
  return {
    visible: true,
    loading: false,
    detail: DETAIL,
    colors,
    onClose: jest.fn(),
    onChangeStatus: jest.fn(),
    onSave: jest.fn().mockResolvedValue(null),
    onDelete: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('StudentDetailDrawer — loading', () => {
  it('shows no student content while loading (spinner branch only)', async () => {
    await render(<StudentDetailDrawer {...baseProps({ loading: true, detail: null })} />);
    expect(screen.queryByText('Account')).toBeNull();
    expect(screen.queryByText('Edit Student')).toBeNull();
  });

  it('shows no student content when detail is null even if loading is false', async () => {
    await render(<StudentDetailDrawer {...baseProps({ loading: false, detail: null })} />);
    expect(screen.queryByText('Account')).toBeNull();
  });
});

describe('StudentDetailDrawer — view mode', () => {
  it('renders student, account, academic, and parent details', async () => {
    await render(<StudentDetailDrawer {...baseProps()} />);
    expect(screen.getByText('Aarav Sharma')).toBeTruthy();
    expect(screen.getByText('aarav@school.test')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Grade 6')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('ADM-001')).toBeTruthy();
    expect(screen.getByText('Mr. Sharma')).toBeTruthy();
    expect(screen.getByText('parent.sharma@school.test')).toBeTruthy();
    expect(screen.getByText('+91 98765 43210')).toBeTruthy();
  });

  it('shows "No parent account linked yet" when parent is null', async () => {
    await render(<StudentDetailDrawer {...baseProps({ detail: { ...DETAIL, parent: null } })} />);
    expect(screen.getByText('No parent account linked yet.')).toBeTruthy();
  });

  it('omits the Phone row when parent has no phone', async () => {
    await render(<StudentDetailDrawer {...baseProps({ detail: { ...DETAIL, parent: { name: 'Mr. Sharma', email: 'p@test.com' } } })} />);
    expect(screen.queryByText('+91 98765 43210')).toBeNull();
  });

  it('shows only the quick-action buttons that make sense for the current status', async () => {
    await render(<StudentDetailDrawer {...baseProps({ detail: { ...DETAIL, status: 'active' } })} />);
    expect(screen.queryByText('Mark Active')).toBeNull(); // already active
    expect(screen.getByText('Mark Inactive')).toBeTruthy();
    expect(screen.getByText('Archive')).toBeTruthy();
  });

  it('calls onChangeStatus with the right status from quick actions', async () => {
    const props = baseProps({ detail: { ...DETAIL, status: 'active' } });
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...props} />);
    await user.press(screen.getByText('Archive'));
    expect(props.onChangeStatus).toHaveBeenCalledWith('archived');
  });

  it('calls onClose when the close icon is pressed', async () => {
    const props = baseProps();
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...props} />);
    await user.press(screen.getByLabelText('Close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('StudentDetailDrawer — edit mode', () => {
  it('switches to edit mode and pre-fills the current values', async () => {
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...baseProps()} />);
    await user.press(screen.getByLabelText('Edit student'));
    expect(screen.getByText('Edit Student')).toBeTruthy();
    expect(screen.getByDisplayValue('Aarav Sharma')).toBeTruthy();
    expect(screen.getByDisplayValue('Grade 6')).toBeTruthy();
  });

  it('saves the edited fields and returns to view mode on success', async () => {
    const props = baseProps();
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...props} />);
    await user.press(screen.getByLabelText('Edit student'));

    const nameInput = screen.getByDisplayValue('Aarav Sharma');
    await user.clear(nameInput);
    await user.type(nameInput, 'Aarav S.');
    await user.press(screen.getByText('Save changes'));

    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Aarav S.', grade: 'Grade 6', section: 'A', admissionNumber: 'ADM-001' })
    ));
    // Returns to view mode on success.
    await waitFor(() => expect(screen.queryByText('Edit Student')).toBeNull());
  });

  it('includes parent fields in the patch only when a parent is linked', async () => {
    const props = baseProps();
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...props} />);
    await user.press(screen.getByLabelText('Edit student'));
    await user.press(screen.getByText('Save changes'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ parentName: 'Mr. Sharma', parentPhone: '+91 98765 43210' })
    ));
  });

  it('omits parent fields from the patch when no parent is linked', async () => {
    const props = baseProps({ detail: { ...DETAIL, parent: null } });
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...props} />);
    await user.press(screen.getByLabelText('Edit student'));
    await user.press(screen.getByText('Save changes'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalled());
    const patch = (props.onSave as jest.Mock).mock.calls[0][0];
    expect(patch).not.toHaveProperty('parentName');
    expect(patch).not.toHaveProperty('parentPhone');
  });

  it('shows the server error and stays in edit mode when save fails', async () => {
    const props = baseProps({ onSave: jest.fn().mockResolvedValue('Admission number already in use.') });
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...props} />);
    await user.press(screen.getByLabelText('Edit student'));
    await user.press(screen.getByText('Save changes'));
    expect(await screen.findByText('Admission number already in use.')).toBeTruthy();
    expect(screen.getByText('Edit Student')).toBeTruthy(); // still in edit mode
  });

  it('cancelling edit mode returns to view without saving', async () => {
    const props = baseProps();
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...props} />);
    await user.press(screen.getByLabelText('Edit student'));
    await user.press(screen.getByText('Cancel'));
    expect(screen.getByText('Aarav Sharma')).toBeTruthy(); // back to view mode title
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('resets the mode and field buffers when a different student is opened', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    const { rerender } = await render(<StudentDetailDrawer {...props} />);
    await user.press(screen.getByLabelText('Edit student'));
    expect(screen.getByText('Edit Student')).toBeTruthy();

    const otherStudent: StudentDetail = { ...DETAIL, id: 'st2', name: 'Diya Patel' };
    await rerender(<StudentDetailDrawer {...props} detail={otherStudent} />);

    // Switching students resets back to view mode.
    expect(screen.getByText('Diya Patel')).toBeTruthy();
    expect(screen.queryByText('Edit Student')).toBeNull();
  });
});

describe('StudentDetailDrawer — delete flow', () => {
  it('shows the delete confirmation with the student name', async () => {
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...baseProps()} />);
    await user.press(screen.getByText('Delete this student permanently'));
    expect(screen.getByText('Delete Student')).toBeTruthy();
    expect(screen.getByText('Delete permanently')).toBeTruthy();
  });

  it('cancelling the delete confirmation returns to view mode', async () => {
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...baseProps()} />);
    await user.press(screen.getByText('Delete this student permanently'));
    await user.press(screen.getByText('Cancel'));
    expect(screen.getByText('Aarav Sharma')).toBeTruthy();
  });

  it('calls onDelete when confirmed', async () => {
    const props = baseProps();
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...props} />);
    await user.press(screen.getByText('Delete this student permanently'));
    await user.press(screen.getByText('Delete permanently'));
    await waitFor(() => expect(props.onDelete).toHaveBeenCalledTimes(1));
  });

  // Fixed bug: handleDelete used to call setMode('view') on failure, which
  // discarded the error (view mode never renders {err}). It now stays in
  // confirmDelete mode on failure, matching handleSave's edit-mode behavior,
  // so the server error is actually visible to the admin.
  it('shows the server error and stays in the delete-confirmation view when delete fails', async () => {
    const props = baseProps({ onDelete: jest.fn().mockResolvedValue('Cannot delete: student has active assignments.') });
    const user = userEvent.setup();
    await render(<StudentDetailDrawer {...props} />);
    await user.press(screen.getByText('Delete this student permanently'));
    await user.press(screen.getByText('Delete permanently'));
    expect(await screen.findByText('Cannot delete: student has active assignments.')).toBeTruthy();
    // Still in the delete-confirmation view, not bounced back to view mode.
    expect(screen.getByText('Delete Student')).toBeTruthy();
    expect(screen.getByText('Delete permanently')).toBeTruthy();
  });
});
