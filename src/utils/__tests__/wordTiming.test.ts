import { splitWords, wordWeight } from '../wordTiming';

const estimateMs = (text: string) => splitWords(text).reduce((a, w) => a + wordWeight(w), 0) * 220;

describe('wordWeight — English (unchanged)', () => {
  test('syllables, function words and punctuation pauses', () => {
    expect(wordWeight('photosynthesis, ')).toBe(4.5);
    expect(wordWeight('the ')).toBeCloseTo(0.7);
    expect(wordWeight('leaves.')).toBe(3.5);
  });
});

describe('wordWeight — Hindi (Devanagari)', () => {
  test('a long Hindi word takes longer than a short one', () => {
    expect(wordWeight('आत्मकथ्य ')).toBeGreaterThan(wordWeight('हम '));
    expect(wordWeight('जयशंकर ')).toBeGreaterThan(wordWeight('की '));
  });

  test('the danda (।) is a full stop: it adds the same pause as "."', () => {
    expect(wordWeight('जानेंगे।') - wordWeight('जानेंगे ')).toBe(1.5);
  });

  // Durations measured from Chrome's "Google हिन्दी" voice at rate 1 (it sends no word boundaries).
  test.each([
    ['नमस्ते! आज हम क्षितिज भाग 2 की यूनिट 3 पढ़ेंगे, जिसमें हम महान कवि जयशंकर प्रसाद और उनकी कविता आत्मकथ्य के बारे में जानेंगे।', 9694],
    ['प्रसाद जी के मित्र चाहते थे कि वे अपनी आत्मकथा लिखें, लेकिन प्रसाद जी का मानना था कि उनके जीवन में ऐसा कुछ महान नहीं है जिसे लोग पढ़ें।', 9005],
    ['जयशंकर प्रसाद छायावाद के प्रमुख कवि थे। उनका जन्म वाराणसी में हुआ था।', 5363],
  ])('estimate stays within 15%% of the real voice: %s', (text, actualMs) => {
    const ratio = estimateMs(text) / actualMs;
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.15);
  });

  test('a danda written as its own word is only a pause, not a spoken word', () => {
    expect(wordWeight('। ')).toBe(1.5);
    expect(wordWeight('है ') + wordWeight('। ')).toBe(wordWeight('है।'));
  });
});
