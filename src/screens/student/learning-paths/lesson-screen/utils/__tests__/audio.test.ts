import { Platform } from 'react-native';
import { speakWithBoundary, stopSpeaking, sentencesWithOffsets } from '../audio';

describe('speakWithBoundary — non-web short-circuit', () => {
  test('calls onEnd immediately on a real native platform (default under jest-expo), never touches speechSynthesis', () => {
    expect(Platform.OS).not.toBe('web');
    const onEnd = jest.fn();
    const onWordBoundary = jest.fn();

    speakWithBoundary('Hello world', onWordBoundary, onEnd);

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onWordBoundary).not.toHaveBeenCalled();
  });
});

describe('stopSpeaking — non-web short-circuit', () => {
  test('is a real no-op on native platforms, does not throw without a speechSynthesis global', () => {
    expect(() => stopSpeaking()).not.toThrow();
  });
});

describe('sentencesWithOffsets', () => {
  test('splits real text into real sentences with correct char offsets', () => {
    const text = 'The cat sat. The dog ran!';
    const result = sentencesWithOffsets(text);

    expect(result).toHaveLength(2);
    expect(result[0].sentence.trim()).toBe('The cat sat.');
    expect(text.slice(result[0].start, result[0].end)).toBe(result[0].sentence);
    expect(result[1].sentence.trim()).toBe('The dog ran!');
  });

  test('ignores real whitespace-only fragments between sentences', () => {
    const text = 'One.   Two?   Three!';
    const result = sentencesWithOffsets(text);
    expect(result.map(r => r.sentence.trim())).toEqual(['One.', 'Two?', 'Three!']);
  });

  test('returns a real empty array for empty text', () => {
    expect(sentencesWithOffsets('')).toEqual([]);
  });

  test('treats real text with no terminal punctuation as one real sentence', () => {
    const result = sentencesWithOffsets('No punctuation here');
    expect(result).toHaveLength(1);
    expect(result[0].sentence).toBe('No punctuation here');
  });
});

describe('sentencesWithOffsets - Hindi and Urdu', () => {
  test('splits at the Hindi danda and the Urdu full stop', () => {
    const { sentencesWithOffsets } = require('../audio');
    const hi = sentencesWithOffsets('बदलू पेशे से मनिहार था। वह चूड़ियाँ बनाता था।');
    expect(hi.map((s: any) => s.sentence.trim())).toEqual(['बदलू पेशे से मनिहार था।', 'वह चूड़ियाँ बनाता था।']);
    expect(sentencesWithOffsets('یہ پہلا جملہ ہے۔ یہ دوسرا ہے۔')).toHaveLength(2);
  });
});
