import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import BrainTeaserCard from '../BrainTeaserCard';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const colors: any = { textMuted: '#888', textMain: '#fff' };
const challenge = { question: 'Why is the sky blue?', answer: 'Light scattering.' };

describe('BrainTeaserCard — before reveal', () => {
  test('shows the real question and a "Reveal Answer" button, no answer text yet', async () => {
    await render(<BrainTeaserCard challenge={challenge} showAnswer={false} onReveal={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Why is the sky blue?')).toBeTruthy();
    expect(screen.getByText('Reveal Answer')).toBeTruthy();
    expect(screen.queryByText('Light scattering.')).toBeNull();
  });

  test('pressing "Reveal Answer" calls the real onReveal handler', async () => {
    const onReveal = jest.fn();
    const user = userEvent.setup();
    await render(<BrainTeaserCard challenge={challenge} showAnswer={false} onReveal={onReveal} styles={styles} colors={colors} />);

    await user.press(screen.getByText('Reveal Answer'));

    expect(onReveal).toHaveBeenCalled();
  });
});

describe('BrainTeaserCard — after reveal', () => {
  test('shows the real answer text and hides the reveal button', async () => {
    await render(<BrainTeaserCard challenge={challenge} showAnswer={true} onReveal={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Light scattering.')).toBeTruthy();
    expect(screen.queryByText('Reveal Answer')).toBeNull();
  });
});
