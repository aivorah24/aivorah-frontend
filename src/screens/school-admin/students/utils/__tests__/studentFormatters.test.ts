import { statusTint, formatJoined, formatLastActive } from '../studentFormatters';

const colors = { accentYellow: '#BAA467' } as any;

describe('statusTint', () => {
  it('returns green for active', () => {
    expect(statusTint(colors, 'active')).toBe('#2F9E44');
  });
  it('returns the theme accent yellow for invited', () => {
    expect(statusTint(colors, 'invited')).toBe('#BAA467');
  });
  it('returns gray for inactive', () => {
    expect(statusTint(colors, 'inactive')).toBe('#6B7280');
  });
  it('returns red for archived', () => {
    expect(statusTint(colors, 'archived')).toBe('#DC2626');
  });
  it('falls back to the archived red for an unknown status', () => {
    expect(statusTint(colors, 'bogus')).toBe('#DC2626');
  });
});

describe('formatJoined', () => {
  it('returns "Today" for a timestamp less than a day old', () => {
    expect(formatJoined(new Date().toISOString())).toBe('Today');
  });
  it('returns "Nd ago" for a timestamp within the last 30 days', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(formatJoined(fiveDaysAgo)).toBe('5d ago');
  });
  it('returns a full date for a timestamp 30+ days old', () => {
    const old = new Date(Date.now() - 40 * 86400000);
    const result = formatJoined(old.toISOString());
    expect(result).toBe(old.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }));
  });
  // new Date('not-a-date') doesn't throw — it silently produces an Invalid
  // Date, so the try/catch fallback never fires for malformed-but-parseable
  // strings; toLocaleDateString on it renders as the literal "Invalid Date".
  it('renders "Invalid Date" for a malformed date string (catch block does not fire)', () => {
    expect(formatJoined('not-a-date')).toBe('Invalid Date');
  });
});

describe('formatLastActive', () => {
  it('returns "Never signed in" for null', () => {
    expect(formatLastActive(null)).toBe('Never signed in');
  });
  it('returns "Never signed in" for an empty string', () => {
    expect(formatLastActive('')).toBe('Never signed in');
  });
  it('returns "Today" for a timestamp less than a day old', () => {
    expect(formatLastActive(new Date().toISOString())).toBe('Today');
  });
  it('returns "Yesterday" for exactly 1 day ago', () => {
    const yesterday = new Date(Date.now() - 1 * 86400000).toISOString();
    expect(formatLastActive(yesterday)).toBe('Yesterday');
  });
  it('returns "N days ago" for a timestamp within the last 30 days', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(formatLastActive(fiveDaysAgo)).toBe('5 days ago');
  });
  it('returns a full date for a timestamp 30+ days old', () => {
    const old = new Date(Date.now() - 40 * 86400000);
    const result = formatLastActive(old.toISOString());
    expect(result).toBe(old.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }));
  });
  // Same non-throwing-Date-constructor caveat as formatJoined above.
  it('renders "Invalid Date" for a malformed date string (catch block does not fire)', () => {
    expect(formatLastActive('not-a-date')).toBe('Invalid Date');
  });
});
