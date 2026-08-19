import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import HabitJournalCard from '../HabitJournalCard';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const baseProps = { cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888', textDim: '#666', styles };

describe('HabitJournalCard — empty journal', () => {
  test('renders nothing when journalText is empty', async () => {
    const { toJSON } = await render(<HabitJournalCard journalText="" {...baseProps} />);
    expect(toJSON()).toBeNull();
  });
});

describe('HabitJournalCard — populated journal', () => {
  test('shows the real header but hides the journal body until expanded', async () => {
    await render(<HabitJournalCard journalText="Today I brushed my teeth." {...baseProps} />);
    expect(screen.getByText('My Daily Journal')).toBeTruthy();
    expect(screen.queryByText('Today I brushed my teeth.')).toBeNull();
  });

  test('pressing the header reveals the real journal text', async () => {
    const user = userEvent.setup();
    await render(<HabitJournalCard journalText="Today I brushed my teeth." {...baseProps} />);

    await user.press(screen.getByText('My Daily Journal'));

    expect(screen.getByText('Today I brushed my teeth.')).toBeTruthy();
  });

  test('pressing the header again collapses it back', async () => {
    const user = userEvent.setup();
    await render(<HabitJournalCard journalText="Today I brushed my teeth." {...baseProps} />);

    await user.press(screen.getByText('My Daily Journal'));
    await user.press(screen.getByText('My Daily Journal'));

    expect(screen.queryByText('Today I brushed my teeth.')).toBeNull();
  });
});
