import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MotivationFooter from '../MotivationFooter';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });

describe('MotivationFooter', () => {
  test('shows the real streak-strength message once streak reaches 7', async () => {
    await render(<MotivationFooter streak={7} textMuted="#888" styles={styles} />);
    expect(screen.getByText('7 days strong! You are building real character.')).toBeTruthy();
  });

  test('shows the real generic encouragement message below a 7-day streak', async () => {
    await render(<MotivationFooter streak={3} textMuted="#888" styles={styles} />);
    expect(screen.getByText("Every great person started with small daily habits. You're on your way!")).toBeTruthy();
  });

  test('a streak of exactly 0 shows the generic message', async () => {
    await render(<MotivationFooter streak={0} textMuted="#888" styles={styles} />);
    expect(screen.getByText("Every great person started with small daily habits. You're on your way!")).toBeTruthy();
  });
});
