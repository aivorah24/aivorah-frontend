import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SceneVisual from '../SceneVisual';

jest.mock('../ZoomableImage', () => () => null);
const colors: any = { cardDark: '#f5f5f5', textMain: '#111', textMuted: '#666', borderColor: '#ccc', primary: '#0a7' };

describe('SceneVisual', () => {
  test('draws a Venn diagram with both labels and the shared middle', async () => {
    await render(<SceneVisual colors={colors} visual={{ kind: 'venn', title: 'Two friends', left: { label: 'Rakesh', items: ['young'] }, right: { label: 'Grandfather', items: ['wise'] }, both: ['love trees'] }} />);
    expect(screen.getByTestId('venn')).toBeTruthy();
    expect(screen.getByText('Rakesh')).toBeTruthy();
    expect(screen.getByText('Grandfather')).toBeTruthy();
    expect(screen.getByText('• love trees')).toBeTruthy();
    expect(screen.getByText('Two friends')).toBeTruthy();
  });

  test('draws a numbered flow and a table grid', async () => {
    const { rerender } = await render(<SceneVisual colors={colors} visual={{ kind: 'flow', steps: ['Plant seed', 'Water it'] }} />);
    expect(screen.getByText('1. Plant seed')).toBeTruthy();
    await rerender(<SceneVisual colors={colors} visual={{ kind: 'table', headers: ['Wonder', 'Place'], rows: [['Lonar Lake', 'Maharashtra']] }} />);
    expect(screen.getByText('Lonar Lake')).toBeTruthy();
    expect(screen.getByTestId('scene-visual-table')).toBeTruthy();
  });
});
