import { fmtCost, fmtCompact, fmtDay, fmtMs, delta } from '../../utils/format';

test('fmtCost keeps small amounts readable and totals in dollars', () => {
  expect(fmtCost(0)).toBe('$0');
  expect(fmtCost(0.00123)).toBe('$0.0012');
  expect(fmtCost(0.4567)).toBe('$0.457');
  expect(fmtCost(97.61)).toBe('$97.61');
  expect(fmtCost(1234.5)).toBe('$1,234.50');
});

test('fmtCompact, fmtDay and fmtMs', () => {
  expect(fmtCompact(950)).toBe('950');
  expect(fmtCompact(339170)).toBe('339.2K');
  expect(fmtCompact(2_400_000)).toBe('2.4M');
  expect(fmtDay('2026-10-06')).toBe('Oct 6');
  expect(fmtMs(850)).toBe('850ms');
  expect(fmtMs(1520)).toBe('1.5s');
});

test('delta vs the previous window', () => {
  expect(delta(0, 0)).toEqual({ text: '—', dir: 'flat' });
  expect(delta(5, 0)).toEqual({ text: 'new', dir: 'up' });
  expect(delta(110, 100)).toEqual({ text: '+10%', dir: 'up' });
  expect(delta(95, 100)).toEqual({ text: '-5.0%', dir: 'down' });
  expect(delta(100.2, 100)).toEqual({ text: '0%', dir: 'flat' });
});
