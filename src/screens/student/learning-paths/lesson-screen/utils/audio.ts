import { Platform } from 'react-native';

// Speaks text and reports word-boundary positions so the UI can highlight
// the word currently being read (karaoke-style), and calls onEnd when done.
export type VoiceProfile = { gender?: 'f' | 'm'; pitch?: number; rate?: number; lang?: string };

// Chrome can garbage-collect an utterance mid-speech and never fire onend; keep a reference.
let speaking: SpeechSynthesisUtterance | null = null;

// Chrome's online voices silently drop a line spoken the instant after cancelling one that is still talking
// (speed change / replay / skip mid-line), so a restart waits a moment.
const RESTART_GAP_MS = 120;
let restartTimer: ReturnType<typeof setTimeout> | null = null;
let interruptedAt = -Infinity;
function clearRestart() {
  if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
}

const FEMALE_VOICES = [/aria/i, /jenny/i, /michelle/i, /zira/i, /samantha/i, /karen/i, /moira/i, /female/i];
const MALE_VOICES = [/guy/i, /ryan/i, /davis/i, /david/i, /mark/i, /alex/i, /daniel/i, /george/i, /male/i];

export function speakWithBoundary(
  text: string,
  onWordBoundary: (charIndex: number) => void,
  onEnd: () => void,
  rate: number = 0.78,
  profile?: VoiceProfile,
  onStart?: () => void,
): void {
  if (Platform.OS !== 'web' || !(window as any).speechSynthesis) { onEnd(); return; }
  const synth = (window as any).speechSynthesis as SpeechSynthesis;
  const wasTalking = synth.speaking || synth.pending || Date.now() - interruptedAt < RESTART_GAP_MS;
  clearRestart();
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate * (profile?.rate ?? 1);
  utter.pitch = profile?.pitch ?? 1.08;
  const voices = synth.getVoices();
  // Prefer the warmer, more natural neural voices when the browser/OS has them,
  // in quality order, before falling back to the older robotic default. These
  // sound far better for a young child than "Microsoft David/Zira".
  const PREFERRED = [
    /aria/i, /jenny/i, /michelle/i, /natural/i,      // Microsoft Edge neural voices
    /google us english/i, /google uk english female/i, // Google (Chrome)
    /samantha/i, /karen/i, /moira/i,                 // Apple
    /zira/i,                                          // last-resort Windows default
  ];
  let pick: SpeechSynthesisVoice | undefined;
  // The script of the text decides the voice too, so Hindi/Urdu text is never handed to an English voice.
  const scriptLang = /[؀-ۿ]/.test(text) ? 'ur' : /[ऀ-ॿ]/.test(text) ? 'hi' : undefined;
  if (scriptLang && !profile?.lang) profile = { ...(profile || {}), lang: scriptLang };
  // Hindi / Urdu lessons are read by a voice for that language when the browser has one.
  if (profile?.lang) {
    const code = profile.lang === 'ur' ? 'ur-PK' : profile.lang === 'hi' ? 'hi-IN' : profile.lang;
    utter.lang = code;
    pick = voices.find((v) => v.lang.toLowerCase().startsWith(profile.lang!.toLowerCase()))
      || (profile.lang === 'ur' ? voices.find((v) => /^hi/i.test(v.lang)) : undefined);
    if (pick) { utter.voice = pick; }
  }
  if (!pick && !profile?.lang) for (const re of PREFERRED) { pick = voices.find(v => re.test(v.name) && /^en/i.test(v.lang)); if (pick) break; }
  if (profile?.gender && !profile?.lang) {
    const pool = profile.gender === 'm' ? MALE_VOICES : FEMALE_VOICES;
    for (const re of pool) {
      const v = voices.find(x => re.test(x.name) && /^en/i.test(x.lang));
      if (v) { pick = v; break; }
    }
  }
  if (!pick && !profile?.lang) pick = voices.find(v => /en[-_]US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
  if (pick) utter.voice = pick;
  utter.onboundary = (e: any) => { if (e.name === 'word' || e.charIndex !== undefined) onWordBoundary(e.charIndex ?? 0); };
  speaking = utter;
  utter.onstart = () => onStart?.();
  utter.onend = () => { if (speaking === utter) speaking = null; onEnd(); };
  utter.onerror = () => onEnd();
  if (wasTalking) restartTimer = setTimeout(() => { restartTimer = null; synth.speak(utter); }, RESTART_GAP_MS);
  else synth.speak(utter);
}

let currentClip: HTMLAudioElement | null = null;

// Plays a recorded line. Returns false when it cannot (not web), so the caller can fall back to browser speech.
export function playClip(url: string, rate: number, onEnd: () => void, onFail: () => void): boolean {
  if (Platform.OS !== 'web' || typeof Audio === 'undefined') return false;
  try { currentClip?.pause(); } catch {}
  const clip = new Audio(url);
  currentClip = clip;
  clip.playbackRate = rate;
  clip.onended = () => { if (currentClip === clip) currentClip = null; onEnd(); };
  clip.onerror = () => { if (currentClip === clip) currentClip = null; onFail(); };
  const p = clip.play();
  if (p && typeof p.catch === 'function') p.catch(() => { if (currentClip === clip) { currentClip = null; onFail(); } });
  return true;
}

export function stopSpeaking() {
  if (currentClip) {
    try { currentClip.pause(); } catch {}
    currentClip.onended = null; currentClip.onerror = null; currentClip = null;
  }
  clearRestart();
  if (Platform.OS === 'web' && (window as any).speechSynthesis) {
    const synth = (window as any).speechSynthesis as SpeechSynthesis;
    if (synth.speaking || synth.pending) interruptedAt = Date.now();
    try { synth.cancel(); } catch {}
  }
}

// Splits text into sentences with their char-offset range, so the Listen tab
// can highlight the whole sentence currently being read (not just one word).
export function sentencesWithOffsets(text: string): { sentence: string; start: number; end: number }[] {
  const out: { sentence: string; start: number; end: number }[] = [];
  // Hindi ends a sentence with । (danda) and Urdu with ۔ — they count as full stops too.
  const re = /[^.!?।۔]+[.!?।۔]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!m[0].trim()) continue;
    out.push({ sentence: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}
