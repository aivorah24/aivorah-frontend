import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import ListenVisualBoard from '../ListenVisualBoard';

jest.mock('../../utils/book', () => ({ bookSrc: () => 'https://example.com/book.pdf' }));

const colors: any = { cardDark: '#f5f5f5', textMain: '#111', textMuted: '#666', borderColor: '#ccc', primary: '#0a7', bgDark: '#fff' };
const cards = [
  { label: 'Action', text: 'Har Datt notices the track.' },
  { label: 'Evidence', text: 'Small droplets of blood are found.' },
  { label: 'Thought', text: 'Mosquito bites are the likely cause.' },
  { label: 'Reasoning', text: 'A long tail would fend off pests.' },
  { label: 'Conclusion', text: 'The camel must have a short tail.' },
];
const topic = { name: 'Camel', pdfFile: 'hepr101.pdf', pdfPage: 35 };
const board = (activeCard: number | null) => (
  <ListenVisualBoard cards={cards} activeCard={activeCard} bookQuote="I noticed small droplets of blood." topic={topic} grade="Grade 8" subject="English" colors={colors} />
);
const selected = (i: number) => screen.getByTestId(`chain-card-${i}`).props.accessibilityState.selected;

describe('ListenVisualBoard', () => {
  test('shows all five cards with the chain view first', async () => {
    await render(board(null));
    expect(screen.getByText('Visual Logic Chain')).toBeTruthy();
    for (let i = 0; i < 5; i += 1) expect(screen.getByTestId(`chain-card-${i}`)).toBeTruthy();
    expect(screen.getByText('Conclusion')).toBeTruthy();
  });

  test('only the card matching the audio is selected, and it moves when the audio moves on', async () => {
    const { rerender } = await render(board(1));
    expect([0, 1, 2, 3, 4].map(selected)).toEqual([false, true, false, false, false]);

    await rerender(board(3));
    expect([0, 1, 2, 3, 4].map(selected)).toEqual([false, false, false, true, false]);
  });

  test('no card is selected while the narration is on a non-card step', async () => {
    await render(board(null));
    expect([0, 1, 2, 3, 4].some(selected)).toBe(false);
  });

  test('cards spoken so far are announced as done via their label; the playing one says so', async () => {
    await render(board(2));
    expect(screen.getByTestId('chain-card-2').props.accessibilityLabel).toContain('Now playing');
    expect(screen.getByTestId('chain-card-0').props.accessibilityLabel).not.toContain('Now playing');
  });

  test('Book Follow-Along tab shows the sentence being read and the page, and can switch back', async () => {
    const user = userEvent.setup();
    await render(board(2));

    await user.press(screen.getByTestId('board-tab-book'));
    expect(screen.getByTestId('book-follow-quote')).toBeTruthy();
    expect(screen.getByText('I noticed small droplets of blood.')).toBeTruthy();
    expect(screen.getByText(/page 35/)).toBeTruthy();
    expect(screen.queryByTestId('chain-card-0')).toBeNull();

    await user.press(screen.getByTestId('board-tab-chain'));
    expect(screen.getByTestId('chain-card-0')).toBeTruthy();
  });

  test('tabs expose their selected state', async () => {
    const user = userEvent.setup();
    await render(board(null));
    expect(screen.getByTestId('board-tab-chain').props.accessibilityState.selected).toBe(true);
    await user.press(screen.getByTestId('board-tab-book'));
    expect(screen.getByTestId('board-tab-book').props.accessibilityState.selected).toBe(true);
  });
});

describe('ListenVisualBoard - follows the play', () => {
  const play = (activeCard: number | null, bookPage: number) => (
    <ListenVisualBoard cards={cards} activeCard={activeCard} bookPage={bookPage} followsBook topic={topic} grade="Grade 8" subject="English" colors={colors} />
  );

  test('opens on the book with a clue strip that lights the current clue', async () => {
    await render(play(2, 35));
    expect(screen.getByTestId('clue-strip')).toBeTruthy();
    expect(screen.getByText('3. Thought').parent).toBeTruthy();
    expect(screen.queryByTestId('chain-card-0')).toBeNull();
  });

  test('the chain tab is still one tap away', async () => {
    const user = userEvent.setup();
    await render(play(null, 30));
    await user.press(screen.getByTestId('board-tab-chain'));
    expect(screen.getByTestId('chain-card-0')).toBeTruthy();
  });
});

describe('ListenVisualBoard - no chain', () => {
  test('shows just the book, with no tabs or clue strip', async () => {
    await render(<ListenVisualBoard cards={[]} activeCard={null} bookPage={5} followsBook topic={topic} grade="Grade 8" subject="English" colors={colors} />);
    expect(screen.queryByTestId('board-tab-chain')).toBeNull();
    expect(screen.queryByTestId('clue-strip')).toBeNull();
  });
});

describe('ListenVisualBoard - scene visuals', () => {
  test('opens on the scene visual when the lesson has visuals, with the book one tap away', async () => {
    const user = userEvent.setup();
    await render(<ListenVisualBoard cards={[]} activeCard={null} bookPage={3} followsBook hasVisuals sceneVisual={{ kind: 'flow', steps: ['Seed', 'Tree'] }} topic={topic} grade="Grade 8" subject="English" colors={colors} />);
    expect(screen.getByTestId('scene-visual-flow')).toBeTruthy();
    await user.press(screen.getByTestId('board-tab-book'));
    expect(screen.queryByTestId('scene-visual-flow')).toBeNull();
  });
});
