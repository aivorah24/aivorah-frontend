import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { StudentsBulkActionBar } from '../StudentsBulkActionBar';

const colors = {
  textHeading: '#F5F3EE', borderColor: 'rgba(245,243,238,0.14)', cardDark: '#141414',
  textMuted: '#A9B0AC', accentRed: '#C98A8A', textDim: '#6E736B', accentYellow: '#BAA467',
} as any;

async function renderBar(overrides: Partial<React.ComponentProps<typeof StudentsBulkActionBar>> = {}) {
  const props = {
    count: 3,
    colors,
    onPromote: jest.fn(),
    onMarkActive: jest.fn(),
    onMarkInactive: jest.fn(),
    onArchive: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
  await render(<StudentsBulkActionBar {...props} />);
  return props;
}

describe('StudentsBulkActionBar', () => {
  it('shows the selected count', async () => {
    await renderBar({ count: 5 });
    expect(screen.getByText('5 selected')).toBeTruthy();
  });

  it('shows 0 selected when count is 0', async () => {
    await renderBar({ count: 0 });
    expect(screen.getByText('0 selected')).toBeTruthy();
  });

  it('calls onPromote when Promote Students is pressed', async () => {
    const props = await renderBar();
    const user = userEvent.setup();
    await user.press(screen.getByText('Promote Students'));
    expect(props.onPromote).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkActive and onMarkInactive independently', async () => {
    const props = await renderBar();
    const user = userEvent.setup();
    await user.press(screen.getByText('Mark Active'));
    await user.press(screen.getByText('Mark Inactive'));
    expect(props.onMarkActive).toHaveBeenCalledTimes(1);
    expect(props.onMarkInactive).toHaveBeenCalledTimes(1);
  });

  it('calls onArchive when Archive is pressed', async () => {
    const props = await renderBar();
    const user = userEvent.setup();
    await user.press(screen.getByText('Archive'));
    expect(props.onArchive).toHaveBeenCalledTimes(1);
  });

  it('calls onClear when Clear is pressed', async () => {
    const props = await renderBar();
    const user = userEvent.setup();
    await user.press(screen.getByText('Clear'));
    expect(props.onClear).toHaveBeenCalledTimes(1);
  });
});
