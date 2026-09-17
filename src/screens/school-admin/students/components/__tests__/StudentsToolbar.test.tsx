import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { StudentsToolbar } from '../StudentsToolbar';

const colors = {
  textDim: '#6E736B', cardDark: '#141414', borderColor: 'rgba(245,243,238,0.14)',
  textMain: '#F5F3EE', textHeading: '#F5F3EE', accentYellow: '#BAA467',
} as any;

describe('StudentsToolbar', () => {
  it('renders the search input with the current query', async () => {
    await render(<StudentsToolbar query="Diya" onQueryChange={jest.fn()} onImport={jest.fn()} onAddStudent={jest.fn()} colors={colors} />);
    expect(screen.getByPlaceholderText('Search by name or admission no').props.value).toBe('Diya');
  });

  it('calls onQueryChange as the user types', async () => {
    const onQueryChange = jest.fn();
    const user = userEvent.setup();
    await render(<StudentsToolbar query="" onQueryChange={onQueryChange} onImport={jest.fn()} onAddStudent={jest.fn()} colors={colors} />);
    await user.type(screen.getByPlaceholderText('Search by name or admission no'), 'A');
    expect(onQueryChange).toHaveBeenCalledWith('A');
  });

  it('calls onImport when Import Students is pressed', async () => {
    const onImport = jest.fn();
    const user = userEvent.setup();
    await render(<StudentsToolbar query="" onQueryChange={jest.fn()} onImport={onImport} onAddStudent={jest.fn()} colors={colors} />);
    await user.press(screen.getByText('Import Students'));
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('calls onAddStudent when Add Student is pressed', async () => {
    const onAddStudent = jest.fn();
    const user = userEvent.setup();
    await render(<StudentsToolbar query="" onQueryChange={jest.fn()} onImport={jest.fn()} onAddStudent={onAddStudent} colors={colors} />);
    await user.press(screen.getByText('Add Student'));
    expect(onAddStudent).toHaveBeenCalledTimes(1);
  });
});
