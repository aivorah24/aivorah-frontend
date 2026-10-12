import { sortRows, toggleSort, filterByText } from '../tableControls';
// (moved from overview/utils — now shared across admin screens)

interface Row { name: string; xp: number; done: boolean }
const rows: Row[] = [
  { name: 'Charlie', xp: 30, done: false },
  { name: 'alice', xp: 10, done: true },
  { name: 'Bob', xp: 20, done: false },
];

describe('sortRows', () => {
  it('returns rows unchanged when no sort key is set', () => {
    expect(sortRows(rows, { key: null, dir: 'asc' })).toEqual(rows);
  });

  it('sorts strings case-insensitively ascending', () => {
    const sorted = sortRows(rows, { key: 'name', dir: 'asc' });
    expect(sorted.map((r) => r.name)).toEqual(['alice', 'Bob', 'Charlie']);
  });

  it('sorts numbers descending', () => {
    const sorted = sortRows(rows, { key: 'xp', dir: 'desc' });
    expect(sorted.map((r) => r.xp)).toEqual([30, 20, 10]);
  });

  it('does not mutate the input array', () => {
    const copy = [...rows];
    sortRows(rows, { key: 'xp', dir: 'asc' });
    expect(rows).toEqual(copy);
  });
});

describe('toggleSort', () => {
  it('sets a new key to ascending', () => {
    expect(toggleSort({ key: null, dir: 'asc' }, 'xp')).toEqual({ key: 'xp', dir: 'asc' });
  });

  it('flips direction when the same key is toggled again', () => {
    expect(toggleSort({ key: 'xp', dir: 'asc' }, 'xp')).toEqual({ key: 'xp', dir: 'desc' });
  });

  it('resets to ascending when switching to a different key', () => {
    expect(toggleSort({ key: 'xp', dir: 'desc' }, 'name')).toEqual({ key: 'name', dir: 'asc' });
  });
});

describe('filterByText', () => {
  it('returns all rows for an empty query', () => {
    expect(filterByText(rows, '  ', ['name'])).toEqual(rows);
  });

  it('matches case-insensitively across any listed field', () => {
    expect(filterByText(rows, 'BOB', ['name']).map((r) => r.name)).toEqual(['Bob']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterByText(rows, 'zzz', ['name'])).toEqual([]);
  });
});
