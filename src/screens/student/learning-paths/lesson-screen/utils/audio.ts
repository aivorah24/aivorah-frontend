import { Platform } from 'react-native';

// Speaks text and reports word-boundary positions so the UI can highlight
// the word currently being read (karaoke-style), and calls onEnd when done.
export function speakWithBoundary(
  text: string,
  onWordBoundary: (charIndex: number) => void,
  onEnd: () => void,
  rate: number = 0.78,
): void {
  if (Platform.OS !== 'web' || !(window as any).speechSynthesis) { onEnd(); return; }
  const synth = (window as any).speechSynthesis as SpeechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate; utter.pitch = 1.08;
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
  for (const re of PREFERRED) { pick = voices.find(v => re.test(v.name) && /^en/i.test(v.lang)); if (pick) break; }
  if (!pick) pick = voices.find(v => /en[-_]US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
  if (pick) utter.voice = pick;
  utter.onboundary = (e: any) => { if (e.name === 'word' || e.charIndex !== undefined) onWordBoundary(e.charIndex ?? 0); };
  utter.onend = () => onEnd();
  utter.onerror = () => onEnd();
  synth.speak(utter);
}

export function stopSpeaking() {
  if (Platform.OS === 'web' && (window as any).speechSynthesis) {
    try { (window as any).speechSynthesis.cancel(); } catch {}
  }
}

// Splits text into sentences with their char-offset range, so the Listen tab
// can highlight the whole sentence currently being read (not just one word).
export function sentencesWithOffsets(text: string): { sentence: string; start: number; end: number }[] {
  const out: { sentence: string; start: number; end: number }[] = [];
  const re = /[^.!?]+[.!?]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!m[0].trim()) continue;
    out.push({ sentence: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}
