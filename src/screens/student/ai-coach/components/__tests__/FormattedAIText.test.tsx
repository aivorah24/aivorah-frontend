import React from 'react';
import { render, screen } from '@testing-library/react-native';
import FormattedAIText from '../FormattedAIText';

const colors = { textMain: '#000', textMuted: '#666', accentYellow: '#fa0' } as any;

describe('FormattedAIText', () => {
  test('renders plain lines as plain text', async () => {
    await render(<FormattedAIText text="Fractions are parts of a whole." colors={colors} />);
    expect(screen.getByText('Fractions are parts of a whole.')).toBeTruthy();
  });

  test('renders bold markdown segments as separate styled runs', async () => {
    await render(<FormattedAIText text="This is **important** information." colors={colors} />);
    expect(screen.getByText('important')).toBeTruthy();
  });

  test('renders a bullet line with a bullet marker', async () => {
    await render(<FormattedAIText text="- First point" colors={colors} />);
    expect(screen.getByText('First point')).toBeTruthy();
  });

  test('renders a numbered line, keeping the real number prefix as the marker', async () => {
    await render(<FormattedAIText text="1. Do this first" colors={colors} />);
    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('Do this first')).toBeTruthy();
  });

  test('blank lines are filtered out entirely', async () => {
    const { toJSON } = await render(<FormattedAIText text={'Line one\n\n\nLine two'} colors={colors} />);
    const rows = (toJSON() as any).children;
    expect(rows).toHaveLength(2);
  });

  test('a "Step 1:" line is recognized and rendered', async () => {
    await render(<FormattedAIText text="Step 1: Add the numbers" colors={colors} />);
    expect(screen.getByText('Step 1: Add the numbers')).toBeTruthy();
  });

  test('an "Answer:" line is recognized and rendered', async () => {
    await render(<FormattedAIText text="Answer: 42" colors={colors} />);
    expect(screen.getByText('Answer: 42')).toBeTruthy();
  });
});
