import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DetailRow } from '../DetailRow';

const colors = { textDim: '#6E736B', textHeading: '#F5F3EE' } as any;

describe('DetailRow', () => {
  it('renders the label and value', async () => {
    await render(<DetailRow label="Login email" value="student@test.com" colors={colors} />);
    expect(screen.getByText('Login email')).toBeTruthy();
    expect(screen.getByText('student@test.com')).toBeTruthy();
  });

  it('renders an empty value without crashing', async () => {
    await render(<DetailRow label="Section" value="" colors={colors} />);
    expect(screen.getByText('Section')).toBeTruthy();
  });

  it('marks the value text as selectable (so admins can copy it)', async () => {
    await render(<DetailRow label="Admission #" value="TSRA-1001" colors={colors} />);
    const value = screen.getByText('TSRA-1001');
    expect(value.props.selectable).toBe(true);
  });
});
