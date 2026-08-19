import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useChapterExpansion } from '../useChapterExpansion';

const chapters = [
  { title: 'Chapter A', topics: [] },
  { title: 'Chapter B', topics: [] },
  { title: 'Chapter C', topics: [] },
] as any;

function Harness({ wantChapterTitle }: { wantChapterTitle?: string }) {
  const h = useChapterExpansion(chapters, wantChapterTitle);
  return (
    <>
      <Text testID="open">{JSON.stringify([...h.openChapters])}</Text>
      <TouchableOpacity testID="toggle1" onPress={() => h.toggleChapter(1)}><Text>x</Text></TouchableOpacity>
    </>
  );
}

describe('useChapterExpansion', () => {
  test('defaults to real chapter 0 open when no deep-link is requested', async () => {
    await render(<Harness />);
    expect(screen.getByTestId('open').props.children).toBe('[0]');
  });

  test('deep-links to the real matching chapter by title, opening only that one', async () => {
    await render(<Harness wantChapterTitle="Chapter B" />);
    expect(screen.getByTestId('open').props.children).toBe('[1]');
  });

  test('an unmatched real deep-link title falls back to the real default (chapter 0)', async () => {
    await render(<Harness wantChapterTitle="Does Not Exist" />);
    expect(screen.getByTestId('open').props.children).toBe('[0]');
  });

  test('toggling a real closed chapter opens it (adds to the open set)', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('toggle1'));

    expect(JSON.parse(screen.getByTestId('open').props.children)).toEqual(expect.arrayContaining([0, 1]));
  });

  test('toggling a real already-open chapter closes it (removes from the open set)', async () => {
    const user = userEvent.setup();
    await render(<Harness wantChapterTitle="Chapter B" />); // opens chapter 1

    await user.press(screen.getByTestId('toggle1'));

    expect(screen.getByTestId('open').props.children).toBe('[]');
  });
});
