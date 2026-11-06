import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import DashboardStatsBar from '../../components/DashboardStatsBar';
import { lightColors, darkColors } from '../../../../../theme';

const style = (el: any) => StyleSheet.flatten(el.props.style);

describe('DashboardStatsBar', () => {
  test('light mode: a light card with readable dark numbers, not a black bar', async () => {
    await render(<DashboardStatsBar students={64} teachers={5} parents={41} activeAnnouncements={4} colors={lightColors} />);
    const bar = style(screen.getByTestId('dashboard-stats-bar'));
    expect(bar.backgroundColor).toBe(lightColors.cardDark);
    expect(bar.backgroundColor).not.toBe('#000');
    expect(bar.borderColor).toBe(lightColors.borderColor);
    expect(style(screen.getByText('64')).color).toBe(lightColors.textHeading);
  });

  test('dark mode: the dark card surface', async () => {
    await render(<DashboardStatsBar students={64} teachers={5} parents={41} activeAnnouncements={4} colors={darkColors} />);
    expect(style(screen.getByTestId('dashboard-stats-bar')).backgroundColor).toBe(darkColors.cardDark);
    expect(screen.getByText('Active announcements')).toBeTruthy();
  });
});
