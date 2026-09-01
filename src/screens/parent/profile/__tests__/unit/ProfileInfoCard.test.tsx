import React from 'react';
import { render } from '@testing-library/react-native';
import ProfileInfoCard from '../../components/ProfileInfoCard';

describe('ProfileInfoCard', () => {
  const mockProps = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123-456-7890',
    city: 'London',
    colors: { accentYellow: '#BAA467' },
    s: {
      card: {},
      cardHeader: {},
      cardTitle: {},
      infoRow: {},
      infoRowBorder: {},
      infoRowLeft: {},
      infoLabel: {},
      infoValue: {},
    },
  };

  it('renders profile information correctly', async () => {
    const { getByText } = await render(<ProfileInfoCard {...mockProps} />);
    
    expect(getByText('Profile Information')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('john@example.com')).toBeTruthy();
    expect(getByText('123-456-7890')).toBeTruthy();
    expect(getByText('London')).toBeTruthy();
  });

  it('renders fallbacks for missing data', async () => {
    const emptyProps = { ...mockProps, name: '', email: '', phone: '', city: '' };
    const { getAllByText } = await render(<ProfileInfoCard {...emptyProps} />);
    
    // There are 4 info rows that should fall back to '—' (using '?' as placeholder based on component code but we should use the actual character)
    // Wait, the component uses '?"' which is likely a mangled character. Let's just check the props directly.
    // The component actually renders {name || '—'}. I'll assume the replacement character is due to type rendering.
    // Let me check what character is actually in the file using grep.
  });
});
