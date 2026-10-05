import { scriptRuns, voiceFor } from '../speechLanguage';

describe('scriptRuns', () => {
  test('plain English stays one English part', () => {
    expect(scriptRuns('Hello world.')).toEqual([{ text: 'Hello world.', start: 0, lang: 'en' }]);
  });

  test('splits English, Hindi and Urdu into parts with their place in the text', () => {
    const text = 'Water is पानी and in Urdu پانی.';
    const runs = scriptRuns(text);
    expect(runs.map((r) => [r.text, r.lang])).toEqual([
      ['Water is', 'en'], ['पानी', 'hi'], ['and in Urdu', 'en'], ['پانی.', 'ur'],
    ]);
    for (const r of runs) expect(text.slice(r.start, r.start + r.text.length)).toBe(r.text);
  });

  test('numbers and punctuation stay with the words around them', () => {
    expect(scriptRuns('कक्षा 3 में, हम पढ़ते हैं।').map((r) => r.lang)).toEqual(['hi']);
  });
});

describe('voiceFor', () => {
  const voices: any[] = [{ lang: 'en-US', name: 'Microsoft Zira' }, { lang: 'hi-IN', name: 'Google हिन्दी' }];
  test('finds a voice for the language', () => {
    expect(voiceFor('hi', voices)?.name).toBe('Google हिन्दी');
  });
  test('no Urdu voice -> none, so the browser picks by lang code', () => {
    expect(voiceFor('ur', voices)).toBeUndefined();
  });
});
