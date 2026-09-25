import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import AddEventModal from '../AddEventModal';

const colors = { textMuted: '#888', textDim: '#666', borderColor: '#333', accentYellow: '#fa0', textMain: '#fff' } as any;
const styles = {
  modalOverlay: {}, modal: {}, modalTitle: {}, modalInput: {}, modalLabel: {},
  chipRow: {}, chipRowContent: {}, timeChip: {}, timeChipText: {},
  modalBtns: {}, modalCancel: {}, modalCancelText: {}, modalConfirm: {}, modalConfirmText: {},
};

function baseProps(overrides: Partial<React.ComponentProps<typeof AddEventModal>> = {}) {
  return {
    visible: true, modalDate: '2026-04-15',
    newTitle: '', setNewTitle: jest.fn(),
    newNote: '', setNewNote: jest.fn(),
    newTag: 'Study Session', setNewTag: jest.fn(),
    isAllDay: false, newStartTime: '09:00', newEndTime: '10:00', setNewEndTime: jest.fn(),
    saving: false,
    onToggleAllDay: jest.fn(), onStartTimeChange: jest.fn(), onClose: jest.fn(), onConfirm: jest.fn(),
    styles, colors,
    ...overrides,
  } as React.ComponentProps<typeof AddEventModal>;
}

describe('AddEventModal', () => {
  test('renders the real modal date in the header', async () => {
    await render(<AddEventModal {...baseProps({ modalDate: '2026-04-22' })} />);
    expect(screen.getByText('Add Event — 2026-04-22')).toBeTruthy();
  });

  test('typing a title calls setNewTitle', async () => {
    const setNewTitle = jest.fn();
    const user = userEvent.setup();
    await render(<AddEventModal {...baseProps({ setNewTitle })} />);
    await user.type(screen.getByTestId('schedule-modal-title-input'), 'H');
    expect(setNewTitle).toHaveBeenCalled();
  });

  test('picking a category tag calls setNewTag with the real tag key', async () => {
    const setNewTag = jest.fn();
    const user = userEvent.setup();
    await render(<AddEventModal {...baseProps({ setNewTag })} />);

    await user.press(screen.getByTestId('schedule-modal-tag-Homework'));

    expect(setNewTag).toHaveBeenCalledWith('Homework');
  });

  test('the currently selected tag is marked selected', async () => {
    await render(<AddEventModal {...baseProps({ newTag: 'Challenge' })} />);
    expect(screen.getByTestId('schedule-modal-tag-Challenge').props.accessibilityState.selected).toBe(true);
  });

  test('offers exactly the student event options, with no emoji', async () => {
    await render(<AddEventModal {...baseProps()} />);
    const labels = screen.getAllByLabelText(/^Category: /).map(n => n.props.accessibilityLabel.replace('Category: ', ''));
    expect(labels).toEqual([
      'Study Session', 'Class / Lesson', 'Homework', 'Assignment', 'Challenge',
      'Quick Task', 'Learning Activity', 'Break', 'Other',
    ]);
    labels.forEach(l => expect(l).not.toMatch(/\p{Extended_Pictographic}/u));
  });

  test('toggling the all-day checkbox calls onToggleAllDay', async () => {
    const onToggleAllDay = jest.fn();
    const user = userEvent.setup();
    await render(<AddEventModal {...baseProps({ onToggleAllDay })} />);

    await user.press(screen.getByTestId('schedule-modal-allday-checkbox'));

    expect(onToggleAllDay).toHaveBeenCalled();
  });

  test('the start/end time pickers are hidden entirely when isAllDay is true', async () => {
    await render(<AddEventModal {...baseProps({ isAllDay: true })} />);
    expect(screen.queryByText('Start time')).toBeNull();
  });

  test('pressing Cancel calls onClose', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<AddEventModal {...baseProps({ onClose })} />);

    await user.press(screen.getByTestId('schedule-modal-cancel-button'));

    expect(onClose).toHaveBeenCalled();
  });

  test('pressing the confirm button calls onConfirm', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    await render(<AddEventModal {...baseProps({ onConfirm })} />);

    await user.press(screen.getByTestId('schedule-modal-confirm-button'));

    expect(onConfirm).toHaveBeenCalled();
  });

  test('while saving, the confirm button is disabled and shows "Saving…"', async () => {
    await render(<AddEventModal {...baseProps({ saving: true })} />);
    expect(screen.getByText('Saving…')).toBeTruthy();
    expect(screen.getByTestId('schedule-modal-confirm-button').props.accessibilityState?.disabled ?? screen.getByTestId('schedule-modal-confirm-button').props.disabled).toBe(true);
  });
});
