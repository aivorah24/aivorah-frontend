// The IME calls aivorah-assignments-service (which now serves
// /quiz/transliterate), never the monolith, and detects any Indic script.
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import TransliterationInput, { detectLangCodeFromText, langNameToCode } from '../TransliterationInput';
import ASSIGNMENTS_SERVER_URL from '../../../config/assignmentsServerUrl';

const colors = { textDim: '#999', textMain: '#fff', cardDark: '#111', borderColor: '#333', accentYellow: '#fa0' };

describe('detectLangCodeFromText / langNameToCode', () => {
  test.each([['అమ్మ', 'te'], ['माँ', 'hi'], ['அம்மா', 'ta'], ['ಅಮ್ಮ', 'kn'], ['അമ്മ', 'ml'], ['মা', 'bn'], ['ମା', 'or'], ['Mom', null]])(
    '%s → %s', (text, code) => expect(detectLangCodeFromText(text)).toBe(code),
  );
  test('names map to IME codes', () => {
    expect(langNameToCode('Tamil')).toBe('ta');
    expect(langNameToCode('French')).toBeNull();
  });
});

describe('TransliterationInput', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('fetches suggestions from the assignments service for the chosen language', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestions: ['அம்மா'] }) }) as any;
    function Host() {
      const [v, setV] = React.useState('');
      return <TransliterationInput value={v} onChangeText={setV} langCode="ta" colors={colors} placeholder="answer" />;
    }
    await render(<Host />);
    fireEvent.changeText(screen.getByPlaceholderText('answer'), 'amma');
    await act(async () => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toBe(`${ASSIGNMENTS_SERVER_URL}/quiz/transliterate?text=amma&lang=ta`);
    expect(url).not.toContain('aivorah.ai/quiz');
  });
});
