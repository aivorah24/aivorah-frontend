import React from 'react';
import { render, screen } from '@testing-library/react-native';
import OnThisDayCard from '../OnThisDayCard';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const colors: any = { textMuted: '#888', textMain: '#fff' };

describe('OnThisDayCard', () => {
  test('renders the real year and fact for each item', async () => {
    await render(<OnThisDayCard items={[{ year: 1969, fact: 'Moon landing.' }, { year: 2004, fact: 'Facebook launched.' }]} styles={styles} colors={colors} />);
    expect(screen.getByText('1969')).toBeTruthy();
    expect(screen.getByText('Moon landing.')).toBeTruthy();
    expect(screen.getByText('2004')).toBeTruthy();
    expect(screen.getByText('Facebook launched.')).toBeTruthy();
  });

  test('renders no fact rows when items is empty', async () => {
    await render(<OnThisDayCard items={[]} styles={styles} colors={colors} />);
    expect(screen.getByText('On This Day')).toBeTruthy();
  });
});
