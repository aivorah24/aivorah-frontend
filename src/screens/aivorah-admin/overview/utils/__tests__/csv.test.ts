import { toCsv } from '../csv';

describe('toCsv', () => {
  it('joins headers and rows with commas and newlines', () => {
    const csv = toCsv(['Name', 'Grade'], [['Asha', 5], ['Ben', 6]]);
    expect(csv).toBe('Name,Grade\nAsha,5\nBen,6');
  });

  it('quotes and escapes cells containing commas, quotes or newlines', () => {
    const csv = toCsv(['Name'], [['Rao, M.'], ['Say "hi"'], ['Line1\nLine2']]);
    expect(csv).toBe('Name\n"Rao, M."\n"Say ""hi"""\n"Line1\nLine2"');
  });

  it('renders null/undefined cells as empty strings', () => {
    const csv = toCsv(['A', 'B'], [[null as any, undefined as any]]);
    expect(csv).toBe('A,B\n,');
  });
});
