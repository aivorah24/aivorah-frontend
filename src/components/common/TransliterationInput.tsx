/**
 * TransliterationInput — a TextInput that lets a user TYPE in English (Latin)
 * and get their words converted to an Indic/target script (Hindi, Telugu, …),
 * so teachers and students can author Language-Acquisition content without a
 * special keyboard. Backed by aivorah-assignments-service GET /quiz/transliterate
 * (Google Input Tools proxy), which also powers the student quiz IME.
 *
 * When `langCode` is null/'en' it behaves exactly like a plain TextInput — so it
 * is safe to use everywhere and only "turns on" for a real target language.
 *
 * UX: as you type a word, suggestions in the target script appear below the
 * field. Tapping a suggestion — or pressing space — commits the current word to
 * the chosen script. Everything already in the target script is left untouched.
 */
import React, { useCallback, useRef, useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, ActivityIndicator, type TextInputProps } from 'react-native';
import ASSIGNMENTS_SERVER_URL from '../../config/assignmentsServerUrl';

// Human language name (as stored on assignments) → Google Input Tools code.
// Extend this as more Language-Acquisition languages are offered.
const LANG_NAME_TO_CODE: Record<string, string> = {
  hindi: 'hi', telugu: 'te', tamil: 'ta', kannada: 'kn', malayalam: 'ml',
  marathi: 'mr', gujarati: 'gu', bengali: 'bn', punjabi: 'pa', odia: 'or',
  urdu: 'ur', sanskrit: 'sa', nepali: 'ne', arabic: 'ar', persian: 'fa', hebrew: 'he',
  sinhala: 'si', amharic: 'am', thai: 'th', russian: 'ru', ukrainian: 'uk', greek: 'el',
  mandarin: 'zh', chinese: 'zh', japanese: 'ja', assamese: 'as',
  // Latin-script languages (French, Spanish…) type normally. Korean has no
  // Google Input Tools transliteration, so it stays a plain TextInput.
};
export function langNameToCode(name?: string | null): string | null {
  if (!name) return null;
  const code = LANG_NAME_TO_CODE[String(name).trim().toLowerCase()];
  return code || null;
}

// Detect a transliteration code from the SCRIPT present in some text (e.g. a
// question written in Devanagari). Lets a student answer field turn on the right
// IME without an explicit language prop — mirrors the server's script detection.
export function detectLangCodeFromText(text?: string | null): string | null {
  if (!text) return null;
  if (/[ऀ-ॿ]/.test(text)) return 'hi'; // Devanagari (Hindi/Marathi/Sanskrit)
  if (/[ఀ-౿]/.test(text)) return 'te'; // Telugu
  if (/[஀-௿]/.test(text)) return 'ta'; // Tamil
  if (/[ಀ-೿]/.test(text)) return 'kn'; // Kannada
  if (/[ഀ-ൿ]/.test(text)) return 'ml'; // Malayalam
  if (/[઀-૿]/.test(text)) return 'gu'; // Gujarati
  if (/[ঀ-৿]/.test(text)) return 'bn'; // Bengali
  if (/[਀-੿]/.test(text)) return 'pa'; // Gurmukhi (Punjabi)
  if (/[଀-୿]/.test(text)) return 'or'; // Odia
  if (/[ٹڈڑںےہھ]/.test(text)) return 'ur'; // Urdu-only letters
  if (/[پچژگ]/.test(text)) return 'fa'; // Persian-only letters
  if (/[؀-ۿ]/.test(text)) return 'ar'; // Arabic
  if (/[֐-׿]/.test(text)) return 'he'; // Hebrew
  if (/[඀-෿]/.test(text)) return 'si'; // Sinhala
  if (/[ሀ-፿]/.test(text)) return 'am'; // Ethiopic (Amharic)
  if (/[฀-๿]/.test(text)) return 'th'; // Thai
  if (/[Ѐ-ӿ]/.test(text)) return 'ru'; // Cyrillic
  if (/[Ͱ-Ͽ]/.test(text)) return 'el'; // Greek
  if (/[぀-ヿ]/.test(text)) return 'ja'; // Japanese kana (before Han)
  if (/[一-鿿]/.test(text)) return 'zh'; // Han (Chinese)
  return null;
}

const LANG_NAME_RE = new RegExp(`\\b(${Object.keys(LANG_NAME_TO_CODE).join('|')})\\b`, 'i');
const MULTI_LANGUAGE_SUBJECTS = ['language acquisition', 'second language'];

// Which language a student answer box should type in. Assignments don't store the
// teacher's language, so: a language subject (e.g. "Telugu"); for Language
// Acquisition / Second Language the language named in the text (beats script, so
// Marathi isn't typed as Hindi); else native script found in the question.
export function resolveTypingLang(subject: string | null | undefined, ...texts: (string | null | undefined)[]): string | null {
  const bySubject = langNameToCode(subject);
  if (bySubject) return bySubject;
  const text = texts.filter(Boolean).join(' ');
  if (MULTI_LANGUAGE_SUBJECTS.includes(subject?.trim().toLowerCase() ?? '')) {
    const named = text.match(LANG_NAME_RE);
    if (named) return langNameToCode(named[1]);
  }
  return detectLangCodeFromText(text);
}

// A representative native-script glyph per language, shown on the IME toggle
// when transliteration is ON (tap it to switch to 'EN' for plain English).
const IME_LABEL: Record<string, string> = {
  hi: 'हि', mr: 'हि', sa: 'सं', ne: 'ने', te: 'తె', ta: 'த', kn: 'ಕ',
  ml: 'മ', gu: 'ગુ', bn: 'বা', pa: 'ਪੰ', or: 'ଓ', ur: 'اُ', ar: 'ع',
  as: 'অ', fa: 'فا', he: 'א', si: 'සි', am: 'አ', th: 'ท', ru: 'Ру', uk: 'Ук', el: 'Ελ', zh: '中', ja: 'あ',
};

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  langCode?: string | null;       // ISO-ish code ('hi','te') OR null/'en' → plain input
  placeholder?: string;
  placeholderTextColor?: string;
  colors: any;
  style?: any;
  multiline?: boolean;
  autoFocus?: boolean;
  onFocus?: TextInputProps['onFocus'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  returnKeyType?: TextInputProps['returnKeyType'];
  editable?: boolean;
};

export default function TransliterationInput({
  value, onChangeText, langCode, placeholder, placeholderTextColor, colors, style, multiline, autoFocus,
  onFocus, onSubmitEditing, returnKeyType, editable,
}: Props) {
  const langSupported = !!langCode && langCode !== 'en';
  // Teachers/students need to type ENGLISH too (names, "Basics of…", brackets),
  // so transliteration is a TOGGLE, like Google Input Tools. Default ON for a
  // language field; tap the అ/EN button to type plain English, tap again to
  // resume native-script typing.
  const [imeOn, setImeOn] = useState(true);
  const active = langSupported && imeOn;
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const currentWordRef = useRef('');           // Latin word currently being typed
  const debounceRef = useRef<any>(null);

  const fetchSuggestions = useCallback((word: string) => {
    if (!active || !word || !/[a-zA-Z]/.test(word)) { setSuggestions([]); return; }
    setLoading(true);
    fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/transliterate?text=${encodeURIComponent(word)}&lang=${langCode}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data) => {
        // The server proxy normalises Google Input Tools to { suggestions: [...] }.
        const cands = data?.suggestions;
        setSuggestions(Array.isArray(cands) ? cands.slice(0, 5) : []);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [active, langCode]);

  // The current word = text after the last whitespace. We only transliterate the
  // word in progress; anything before it is already committed.
  const handleChange = (next: string) => {
    onChangeText(next);
    if (!active) return;
    const lastWord = next.split(/\s/).pop() || '';
    currentWordRef.current = lastWord;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!lastWord || !/[a-zA-Z]/.test(lastWord)) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(lastWord), 220);
  };

  // Replace the current (last) Latin word with the chosen target-script word.
  const commit = (chosen: string) => {
    const idx = value.lastIndexOf(currentWordRef.current);
    const base = idx >= 0 ? value.slice(0, idx) : value;
    onChangeText(`${base}${chosen} `);
    setSuggestions([]);
    currentWordRef.current = '';
  };

  const scriptLabel = (langCode && IME_LABEL[langCode]) || 'अ';

  return (
    <View style={{ position: 'relative' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || colors.textDim}
          style={[style, { flex: 1 }]}
          multiline={multiline}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          editable={editable}
          // Space commits the top suggestion (fast typing flow) when one exists.
          onKeyPress={active ? (e: any) => {
            if (e.nativeEvent?.key === ' ' && suggestions.length > 0) {
              e.preventDefault?.();
              commit(suggestions[0]);
            }
          } : undefined}
        />
        {langSupported && (
          <Pressable
            onPress={() => { setImeOn(v => !v); setSuggestions([]); }}
            style={[styles.imeToggle, {
              borderColor: imeOn ? colors.accentYellow : colors.borderColor,
              backgroundColor: imeOn ? colors.accentYellow + '18' : 'transparent',
            }]}
            accessibilityLabel={imeOn ? 'Switch to English typing' : 'Switch to native-script typing'}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: imeOn ? colors.accentYellow : colors.textDim }}>
              {imeOn ? scriptLabel : 'EN'}
            </Text>
          </Pressable>
        )}
      </View>
      {active && (suggestions.length > 0 || loading) && (
        <View style={[styles.suggestBar, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
          {loading && suggestions.length === 0 ? (
            <ActivityIndicator size="small" color={colors.accentYellow} />
          ) : suggestions.map((s) => (
            <Pressable key={s} onPress={() => commit(s)} style={[styles.chip, { backgroundColor: colors.bgDark, borderColor: colors.borderColor }]}>
              <Text style={[styles.chipTxt, { color: colors.textMain }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  suggestBar: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center',
    marginTop: 4, padding: 6, borderRadius: 8, borderWidth: 1,
  },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  chipTxt: { fontSize: 14, fontWeight: '600' },
  imeToggle: {
    minWidth: 40, height: 36, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
