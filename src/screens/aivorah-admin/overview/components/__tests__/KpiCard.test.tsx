import React from 'react';
import { render, screen } from '@testing-library/react-native';
import KpiCard from '../KpiCard';

const colors = { textDim: '#888' } as any;
const styles = { kpiCard: {}, kpiTopRow: {}, kpiBar: {}, kpiBody: {}, kpiValue: {}, kpiLabel: {} };

describe('KpiCard', () => {
  it('renders the value and label', async () => {
    await render(<KpiCard icon="users" color="#fff" value={508} label="Total Users" colors={colors} styles={styles} />);
    expect(screen.getByText('508')).toBeTruthy();
    expect(screen.getByText('Total Users')).toBeTruthy();
  });

  it('renders a string value as-is (e.g. a formatted percentage)', async () => {
    await render(<KpiCard icon="bar-chart-2" color="#fff" value="62%" label="B2B Share" colors={colors} styles={styles} />);
    expect(screen.getByText('62%')).toBeTruthy();
  });
});
