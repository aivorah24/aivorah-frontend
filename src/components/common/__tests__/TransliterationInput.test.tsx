// The IME calls aivorah-assignments-service (which now serves
// /quiz/transliterate), never the monolith, and detects any Indic script.
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import TransliterationInput, { detectLangCodeFromText, langNameToCode, resolveTypingLang } from '../TransliterationInput';
import { LANGUAGES } from '../../../screens/teacher/assignments/constants';
import { assignmentLanguageText } from '../../../screens/student/assignments/utils';
import ASSIGNMENTS_SERVER_URL from '../../../config/assignmentsServerUrl';

const colors = { textDim: '#999', textMain: '#fff', cardDark: '#111', borderColor: '#333', accentYellow: '#fa0' };

describe('detectLangCodeFromText / langNameToCode', () => {
  test.each([['అమ్మ', 'te'], ['माँ', 'hi'], ['அம்மா', 'ta'], ['ಅಮ್ಮ', 'kn'], ['അമ്മ', 'ml'], ['মা', 'bn'], ['ମା', 'or'], ['Mom', null],
    ['你好', 'zh'], ['ありがとう', 'ja'], ['привет', 'ru'], ['καλημέρα', 'el'], ['สวัสดี', 'th'], ['مرحبا', 'ar'], ['شکریہ', 'ur']])(
    '%s → %s', (text, code) => expect(detectLangCodeFromText(text)).toBe(code),
  );
  test('names map to IME codes', () => {
    expect(langNameToCode('Tamil')).toBe('ta');
    expect(langNameToCode('French')).toBeNull();
    expect(langNameToCode('Mandarin')).toBe('zh');
    expect(langNameToCode('Assamese')).toBe('as');
  });
});

describe('resolveTypingLang (which language the student types in)', () => {
  test('every non-Latin language a teacher can pick has a typing language', () => {
    const latin = ['French', 'German', 'Spanish', 'Dutch', 'Italian', 'Portuguese'];
    LANGUAGES.filter(l => !latin.includes(l)).forEach(l => expect([l, langNameToCode(l)]).toEqual([l, expect.any(String)]));
    latin.forEach(l => expect(langNameToCode(l)).toBeNull());
  });

  test('a language subject turns typing on, even with English-only questions', () => {
    expect(resolveTypingLang('Hindi', 'Write 5 sentences about your family')).toBe('hi');
    expect(resolveTypingLang('Telugu', 'Describe your school')).toBe('te');
  });

  test('Language Acquisition / Second Language use the language named in the assignment', () => {
    const a = { title: 'Chapter 10', note: 'Practise greetings in Telugu', successCriteria: [], taskSteps: [{ label: 'Speak', instructions: 'Say hello' }] };
    expect(resolveTypingLang('Language Acquisition', 'What do you say?', assignmentLanguageText(a))).toBe('te');
    expect(resolveTypingLang('Second Language', 'Marathi: लिहा')).toBe('mr'); // named language beats shared Devanagari
  });

  test('other subjects only switch on when the question is in a native script', () => {
    expect(resolveTypingLang('Social Studies', 'Hindi is spoken in many states')).toBeNull();
    expect(resolveTypingLang('Mathematics', 'दो और दो कितने होते हैं?')).toBe('hi');
    expect(resolveTypingLang('English', 'Write a poem')).toBeNull();
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
