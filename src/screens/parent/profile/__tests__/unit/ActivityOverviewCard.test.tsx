import React from 'react';
import { render } from '@testing-library/react-native';
import ActivityOverviewCard from '../../components/ActivityOverviewCard';

// describe - Jest function (used to group related tests together).
describe('ActivityOverviewCard', () => {
  const mockProps = {
    activeDays: 4,
    totalStudyDisplay: '2h 30m',
    childrenCount: 2,
    colors: { accentYellow: '#BAA467' },
    // Styles the component expects
    s: {
      card: {},
      cardHeader: {},
      cardTitle: {},
      weekBadge: {},
      weekBadgeText: {},
      statsGrid: {},
      statCell: {},
      statBig: {},
      statSmallLabel: {},
      statDividerV: {},
    },
  };

  it('renders activity overview correctly', async () => {
    const { getByText } = await render(<ActivityOverviewCard {...mockProps} />);
    
    expect(getByText('Activity Overview')).toBeTruthy();
    expect(getByText('This Week')).toBeTruthy();
    
    // Checks for stats
    expect(getByText(/4/)).toBeTruthy();
    expect(getByText('ACTIVE DAYS')).toBeTruthy();

    expect(getByText('2h 30m')).toBeTruthy();
    expect(getByText('TOTAL LEARNING TIME')).toBeTruthy();

    expect(getByText('2 kids')).toBeTruthy();
    expect(getByText('LINKED')).toBeTruthy();
  });
});
