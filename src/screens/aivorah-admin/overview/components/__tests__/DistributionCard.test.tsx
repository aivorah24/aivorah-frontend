import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DistributionCard from '../DistributionCard';

const styles = {
  distCard: {}, distCardTitle: {}, barRow: {}, barLabel: {}, barTrack: {}, barFill: {}, barValue: {}, emptyRowText: {},
};

describe('DistributionCard', () => {
  it('renders a bar row per entry with its label and value', async () => {
    await render(
      <DistributionCard
        title="Curriculum"
        rows={[{ label: 'CBSE', value: 10 }, { label: 'NCERT', value: 4 }]}
        color="#fff"
        styles={styles}
      />
    );
    expect(screen.getByText('Curriculum')).toBeTruthy();
    expect(screen.getByText('CBSE')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('NCERT')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('shows an empty state when there are no rows', async () => {
    await render(<DistributionCard title="Curriculum" rows={[]} color="#fff" styles={styles} />);
    expect(screen.getByText('No data yet.')).toBeTruthy();
  });
});
