import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { FilterDropdown } from '../FilterDropdown';

const colors = {
  borderColor: 'rgba(245,243,238,0.14)', cardDark: '#141414', textHeading: '#F5F3EE',
  textDim: '#6E736B', textMuted: '#A9B0AC', cardHover: '#1A1A1A', accentYellow: '#BAA467',
} as any;

const OPTIONS = [
  { value: 'all', label: 'All grades' },
  { value: 'Grade 6', label: 'Grade 6' },
  { value: 'Grade 7', label: 'Grade 7' },
];

describe('FilterDropdown', () => {
  it('shows the label for the current value when nothing else matches', async () => {
    await render(<FilterDropdown label="All grades" value="unknown" options={[]} onChange={jest.fn()} colors={colors} />);
    expect(screen.getByText('All grades')).toBeTruthy();
  });

  it('shows the matching option label as the trigger text', async () => {
    await render(<FilterDropdown label="All grades" value="Grade 6" options={OPTIONS} onChange={jest.fn()} colors={colors} />);
    expect(screen.getByText('Grade 6')).toBeTruthy();
  });

  it('opens the menu on press and shows all options', async () => {
    const user = userEvent.setup();
    await render(<FilterDropdown label="All grades" value="all" options={OPTIONS} onChange={jest.fn()} colors={colors} />);
    await user.press(screen.getByRole('button'));
    expect(screen.getByText('Grade 7')).toBeTruthy();
  });

  it('calls onChange with the selected value and closes the menu', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<FilterDropdown label="All grades" value="all" options={OPTIONS} onChange={onChange} colors={colors} />);
    await user.press(screen.getByRole('button'));
    await user.press(screen.getByText('Grade 7'));
    expect(onChange).toHaveBeenCalledWith('Grade 7');
  });
});
