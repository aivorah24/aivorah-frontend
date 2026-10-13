import { computeOverallPct } from '../progressCalculations';

describe('computeOverallPct', () => {
  test('divides completed by total normally', () => {
    expect(computeOverallPct(2, 4)).toBe(50);
  });

  test('zero total topics returns 0, not NaN/Infinity (B005 divide-by-zero)', () => {
    expect(computeOverallPct(2, 0)).toBe(0);
    expect(computeOverallPct(0, 0)).toBe(0);
  });

  test('caps at 100% when completed exceeds total (stale/mismatched curriculum denominator)', () => {
    expect(computeOverallPct(5, 4)).toBe(100);
  });

  test('zero completed against a real total is a real 0%', () => {
    expect(computeOverallPct(0, 10)).toBe(0);
  });
});
