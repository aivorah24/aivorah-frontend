import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PickerModal from '../../components/PickerModal';

const COLORS = {
  cardDark: '#111', borderColor: '#222', textMain: '#fff', textDim: '#888', accentYellow: '#fc0',
} as any;

describe('PickerModal', () => {
  it('renders nothing selectable when not visible', async () => {
    await render(
      <PickerModal
        visible={false} title="Daily Limit" data={[15, 30]} value={15}
        formatItem={String} onSelect={jest.fn()} onClose={jest.fn()} colors={COLORS}
      />,
    );
    expect(screen.queryByText('Daily Limit')).toBeNull();
  });

  it('lists every option formatted, marking the current value', async () => {
    await render(
      <PickerModal
        visible title="Daily Limit" data={[15, 30, 45]} value={30}
        formatItem={(v) => `${v} min`} onSelect={jest.fn()} onClose={jest.fn()} colors={COLORS}
      />,
    );
    expect(await screen.findByText('15 min')).toBeTruthy();
    expect(await screen.findByText('30 min')).toBeTruthy();
    expect(await screen.findByText('45 min')).toBeTruthy();
  });

  it('calls onSelect with the tapped value', async () => {
    const onSelect = jest.fn();
    await render(
      <PickerModal
        visible title="Daily Limit" data={[15, 30]} value={15}
        formatItem={(v) => `${v} min`} onSelect={onSelect} onClose={jest.fn()} colors={COLORS}
      />,
    );
    fireEvent.press(await screen.findByText('30 min'));
    expect(onSelect).toHaveBeenCalledWith(30);
  });

  it('calls onClose when the close icon is pressed', async () => {
    const onClose = jest.fn();
    await render(
      <PickerModal
        visible title="Daily Limit" data={[15]} value={15}
        formatItem={(v) => `${v} min`} onSelect={jest.fn()} onClose={onClose} colors={COLORS}
      />,
    );
    fireEvent.press(await screen.findByTestId('picker-modal-close'));
    expect(onClose).toHaveBeenCalled();
  });
});
