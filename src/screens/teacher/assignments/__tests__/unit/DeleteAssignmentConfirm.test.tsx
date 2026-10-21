import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DeleteAssignmentConfirm } from '../../components/DeleteAssignmentConfirm';

const colors = { cardDark: '#111', borderColor: '#333', accentRed: '#f00', textMain: '#fff', textMuted: '#ccc' } as any;

describe('DeleteAssignmentConfirm', () => {
  test('hidden until an assignment is pending', async () => {
    await render(<DeleteAssignmentConfirm title={null} colors={colors} onConfirm={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.queryByText('Delete assignment?')).toBeNull();
  });

  test('Delete confirms, Cancel does not', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(<DeleteAssignmentConfirm title="Chapter 10 - Force" colors={colors} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByText(/Chapter 10 - Force/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('delete-assignment-cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('delete-assignment-confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });
});
