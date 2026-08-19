import { preprocessForTTS } from '../ttsText';

describe('preprocessForTTS', () => {
  test('converts a simple fraction to spoken words', () => {
    expect(preprocessForTTS('1/2')).toBe('one half');
  });

  test('converts a fraction with an unmapped denominator to "over N"', () => {
    expect(preprocessForTTS('3/13')).toBe('three over 13');
  });

  test('converts a decimal to "point" notation', () => {
    expect(preprocessForTTS('3.14')).toBe('3 point 14');
  });

  test('converts arithmetic symbols to spoken words', () => {
    expect(preprocessForTTS('2+2=4')).toBe('2 plus 2 equals 4');
    expect(preprocessForTTS('3×4')).toBe('3 times 4');
    expect(preprocessForTTS('10÷2')).toBe('10 divided by 2');
  });

  test('an unmapped numerator (e.g. 13) falls back to the raw digit string', () => {
    expect(preprocessForTTS('13/4')).toBe('13 fourths');
  });

  test('plain text with no numbers or symbols is unchanged', () => {
    expect(preprocessForTTS('Fractions are fun to learn.')).toBe('Fractions are fun to learn.');
  });

  test('multiple patterns in one string are all converted', () => {
    expect(preprocessForTTS('1/2 + 1/2 = 1')).toBe('one half plus one half equals 1');
  });
});
