import { textAfterFirstLine } from '../../utils/pdfLines';

describe('textAfterFirstLine — Subject Breakdown keeps every word', () => {
  test('returns exactly the words the first (narrower) line did not take', () => {
    const insight = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    const firstLine = 'one two three four five six seven eight nine ten';
    expect(textAfterFirstLine(insight, firstLine)).toBe('eleven twelve thirteen');
  });

  test('nothing left when the first line took it all', () => {
    expect(textAfterFirstLine('short insight', 'short insight')).toBe('');
  });

  test('works for Hindi', () => {
    expect(textAfterFirstLine('जयशंकर प्रसाद: जीवन और साहित्य', 'जयशंकर प्रसाद:')).toBe('जीवन और साहित्य');
  });
});
