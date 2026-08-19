import { sanitizeDisplayedAIText } from '../textFormatting';

describe('sanitizeDisplayedAIText', () => {
  test('strips leading markdown heading hashes', () => {
    expect(sanitizeDisplayedAIText('## Fractions\nSome text')).toBe('Fractions\nSome text');
  });

  test('strips backtick code-fence markers', () => {
    expect(sanitizeDisplayedAIText('```js\ncode\n```')).toBe('js\ncode\n');
  });

  test('normalizes carriage returns away', () => {
    expect(sanitizeDisplayedAIText('line1\r\nline2')).toBe('line1\nline2');
  });

  test('inserts a line break before "Step N" so steps render as separate lines', () => {
    expect(sanitizeDisplayedAIText('First do this. Step 1: add the numbers')).toBe('First do this.\nStep 1: add the numbers');
  });

  test('inserts a line break before "Answer:"', () => {
    expect(sanitizeDisplayedAIText('So the total is Answer: 42')).toBe('So the total is\nAnswer: 42');
  });

  test('inserts a line break before a practice-question lead-in', () => {
    expect(sanitizeDisplayedAIText('Great job! Try this: what is 2+2?')).toBe('Great job!\nTry this: what is 2+2?');
  });

  test('replaces "keyboards and mice" with the corrected phrase', () => {
    expect(sanitizeDisplayedAIText('You need keyboards and mice to type.')).toBe('You need keyboards and a mouse to type.');
  });

  test('replaces a bare "mice" with "mouse" (computer context)', () => {
    expect(sanitizeDisplayedAIText('Click the mice button.')).toBe('Click the mouse button.');
  });

  test('empty/undefined input -> empty string, no crash', () => {
    expect(sanitizeDisplayedAIText('')).toBe('');
    expect(sanitizeDisplayedAIText(undefined as any)).toBe('');
  });

  test('plain text with none of the special patterns is returned unchanged', () => {
    expect(sanitizeDisplayedAIText('Fractions represent parts of a whole.')).toBe('Fractions represent parts of a whole.');
  });
});
