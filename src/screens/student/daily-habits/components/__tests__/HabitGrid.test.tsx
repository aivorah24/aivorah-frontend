import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import HabitGrid from '../HabitGrid';
import type { Habit } from '../../types';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const baseProps = {
  cardDark: '#111', textMain: '#fff', textMuted: '#888', textDim: '#666', emptyBorderColor: '#333', styles,
};

function makeTask(overrides: Partial<Habit & { fromParent: boolean }> = {}): Habit & { fromParent: boolean } {
  return { id: 't1', label: 'Brush teeth', icon: 'smile', coins: 5, fromParent: true, ...overrides };
}

describe('HabitGrid — empty state', () => {
  test('shows a real "No habits yet" message when there are no tasks', async () => {
    await render(<HabitGrid tasks={[]} completed={[]} checking={null} coinPop={null} onToggle={jest.fn()} {...baseProps} />);
    expect(screen.getByText('No habits yet')).toBeTruthy();
    expect(screen.getByText('Ask your parent to assign daily habits for you.')).toBeTruthy();
  });
});

describe('HabitGrid — populated', () => {
  test('shows real task labels and coin values', async () => {
    await render(<HabitGrid tasks={[makeTask({ id: 't1', label: 'Brush teeth', coins: 5 }), makeTask({ id: 't2', label: 'Read', coins: 10 })]} completed={[]} checking={null} coinPop={null} onToggle={jest.fn()} {...baseProps} />);
    expect(screen.getByText('Brush teeth')).toBeTruthy();
    expect(screen.getByText('+5')).toBeTruthy();
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('+10')).toBeTruthy();
  });

  test('pressing an uncompleted habit calls the real onToggle with its id', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(<HabitGrid tasks={[makeTask({ id: 't1', label: 'Brush teeth' })]} completed={[]} checking={null} coinPop={null} onToggle={onToggle} {...baseProps} />);

    await user.press(screen.getByText('Brush teeth'));

    expect(onToggle).toHaveBeenCalledWith('t1');
  });

  test('shows a real coin pop overlay for the exact task that just earned coins', async () => {
    await render(<HabitGrid tasks={[makeTask({ id: 't1', label: 'Brush teeth', coins: 3 })]} completed={['t1']} checking={null} coinPop={{ id: 't1', coins: 5 }} onToggle={jest.fn()} {...baseProps} />);
    expect(screen.getByText('+3')).toBeTruthy(); // the habit card's own coin value
    expect(screen.getByText('+5')).toBeTruthy(); // the distinct coin-pop badge
  });

  test('all habit cards are disabled while any one is checking', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(<HabitGrid tasks={[makeTask({ id: 't1', label: 'Brush teeth' }), makeTask({ id: 't2', label: 'Read' })]} completed={[]} checking="t1" coinPop={null} onToggle={onToggle} {...baseProps} />);

    await user.press(screen.getByText('Read'));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
