import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ThinkingIndicator from '../ThinkingIndicator';

describe('ThinkingIndicator', () => {
  test('renders the real "thinking" label', async () => {
    await render(<ThinkingIndicator colors={{ accentYellow: '#fa0', textMuted: '#666' } as any} />);
    expect(screen.getByText('Aivorah is thinking...')).toBeTruthy();
  });
});
