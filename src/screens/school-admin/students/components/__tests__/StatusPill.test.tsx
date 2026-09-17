import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatusPill } from '../StatusPill';

describe('StatusPill', () => {
  it('renders the given label', async () => {
    await render(<StatusPill label="Active" tint="#2F9E44" />);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('applies the tint color to the text', async () => {
    await render(<StatusPill label="Archived" tint="#DC2626" />);
    const text = screen.getByText('Archived');
    const flatStyle = [].concat(text.props.style).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
    expect(flatStyle.color).toBe('#DC2626');
  });

  it('merges an extra style override (e.g. alignSelf) without dropping the base pill styling', async () => {
    await render(<StatusPill label="Inactive" tint="#6B7280" style={{ alignSelf: 'flex-start' }} />);
    const text = screen.getByText('Inactive');
    // The pill (parent View) should carry both the base style and the override.
    const pillView = text.parent;
    const flatStyle = [].concat(pillView?.props.style).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
    expect(flatStyle.alignSelf).toBe('flex-start');
    expect(flatStyle.borderRadius).toBe(999); // base styling preserved
  });
});
