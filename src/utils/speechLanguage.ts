// Splits text into English / Hindi (Devanagari) / Urdu (Arabic script) parts so each part
// is read by a voice for its own language. Digits, spaces and punctuation stay with their part.
export type SpeechLang = 'en' | 'hi' | 'ur';
export type SpeechRun = { text: string; start: number; lang: SpeechLang };

function langOf(ch: string): SpeechLang | null {
  const c = ch.codePointAt(0) || 0;
  if (c >= 0x0900 && c <= 0x097f) return 'hi';
  if ((c >= 0x0600 && c <= 0x06ff) || (c >= 0x0750 && c <= 0x077f) || (c >= 0xfb50 && c <= 0xfeff)) return 'ur';
  if (/[A-Za-z]/.test(ch)) return 'en';
  return null;
}

export function scriptRuns(text: string): SpeechRun[] {
  const raw: { lang: SpeechLang; from: number; to: number }[] = [];
  let lead = 0;
  for (let i = 0; i < text.length; i += 1) {
    const lang = langOf(text[i]);
    if (!lang) continue;
    const last = raw[raw.length - 1];
    if (last && last.lang === lang) last.to = i + 1;
    else {
      if (last) last.to = i;
      raw.push({ lang, from: raw.length ? i : lead, to: i + 1 });
    }
  }
  if (!raw.length) return text.trim() ? [{ text: text.trim(), start: text.indexOf(text.trim()), lang: 'en' }] : [];
  raw[raw.length - 1].to = text.length;
  return raw.map(({ lang, from, to }) => {
    const chunk = text.slice(from, to);
    const trimmed = chunk.trim();
    return { text: trimmed, start: from + chunk.indexOf(trimmed), lang };
  }).filter((r) => r.text);
}

export const speechLangCode = (lang: SpeechLang) => (lang === 'hi' ? 'hi-IN' : lang === 'ur' ? 'ur-PK' : 'en-IN');

export function voiceFor(lang: SpeechLang, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang));
}
