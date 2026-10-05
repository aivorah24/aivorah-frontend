import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import ChallengeTabs from '../ChallengeTabs';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const colors: any = { borderColor: '#333', textDim: '#666' };

function counts(overrides: Partial<{ available: number; assigned: number; inProgress: number; completed: number }> = {}) {
  return { available: 0, assigned: 0, inProgress: 0, completed: 0, ...overrides };
}

describe('ChallengeTabs — rendering all tabs', () => {
  test('renders Available, Assigned, In Progress, and Completed tabs', async () => {
    await render(<ChallengeTabs activeTab="Available" setActiveTab={jest.fn()} counts={counts()} styles={styles} colors={colors} />);
    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('Assigned')).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  test('In Progress shows its own count', async () => {
    await render(<ChallengeTabs activeTab="Available" setActiveTab={jest.fn()} counts={counts({ inProgress: 2 })} styles={styles} colors={colors} />);
    expect(screen.getByText('2')).toBeTruthy();
  });
});

describe('ChallengeTabs — count badges', () => {
  test('a tab with a zero count shows no badge number', async () => {
    await render(<ChallengeTabs activeTab="Available" setActiveTab={jest.fn()} counts={counts({ assigned: 0 })} styles={styles} colors={colors} />);
    // No stray "0" badge text anywhere for the Assigned tab
    expect(screen.queryByText('0')).toBeNull();
  });

  test('a tab with a positive count shows the real number as a badge', async () => {
    await render(<ChallengeTabs activeTab="Available" setActiveTab={jest.fn()} counts={counts({ assigned: 3, completed: 5 })} styles={styles} colors={colors} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });
});

describe('ChallengeTabs — switching', () => {
  test('pressing a tab calls setActiveTab with the real tab name', async () => {
    const setActiveTab = jest.fn();
    const user = userEvent.setup();
    await render(<ChallengeTabs activeTab="Available" setActiveTab={setActiveTab} counts={counts()} styles={styles} colors={colors} />);

    await user.press(screen.getByText('Completed'));

    expect(setActiveTab).toHaveBeenCalledWith('Completed');
  });
});
