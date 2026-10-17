import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { parseAIReply, replySegments, wordAt } from '../utils/aiReply';
import { scriptRuns, speechLangCode, voiceFor } from '../utils/speechLanguage';

export type ReadPosition = { block: number; row?: number; word: number };

// Natural neural voices first, same order as the Learning Path Listen tab.
const PREFERRED = [/aria/i, /jenny/i, /michelle/i, /natural/i, /google us english/i, /google uk english female/i, /samantha/i, /karen/i, /moira/i, /zira/i];

function englishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  for (const re of PREFERRED) {
    const v = voices.find((x) => re.test(x.name) && /^en/i.test(x.lang));
    if (v) return v;
  }
  return voices.find((v) => /female|woman/i.test(v.name) && /^en/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
}

// Reads an AI reply one line (or table row) at a time, reporting the line and
// word being spoken so the UI can highlight it. Lines are queued one after the
// other, which also avoids Chrome cutting off long utterances.
export function useReplyReader<K extends string | number>() {
  const [speakingKey, setSpeakingKey] = useState<K | null>(null);
  const [position, setPosition] = useState<ReadPosition | null>(null);
  const seqRef = useRef(0);

  const synth = (): SpeechSynthesis | null =>
    Platform.OS === 'web' && typeof window !== 'undefined' ? (window as any).speechSynthesis || null : null;

  const stop = useCallback(() => {
    seqRef.current += 1;
    try { synth()?.cancel(); } catch {}
    setSpeakingKey(null);
    setPosition(null);
  }, []);

  useEffect(() => () => { seqRef.current += 1; try { synth()?.cancel(); } catch {} }, []);

  const toggle = useCallback((key: K, text: string) => {
    if (speakingKey === key) { stop(); return; }
    stop();
    const s = synth();
    if (!s) return;
    const segments = replySegments(parseAIReply(text));
    if (!segments.length) return;
    const seq = seqRef.current;
    const voices = s.getVoices();
    const english = englishVoice(voices);
    setSpeakingKey(key);

    const finish = () => { if (seq === seqRef.current) { setSpeakingKey(null); setPosition(null); } };
    const playSegment = (si: number) => {
      if (seq !== seqRef.current) return;
      if (si >= segments.length) { finish(); return; }
      const seg = segments[si];
      setPosition({ block: seg.block, row: seg.row, word: seg.offsets.length ? seg.offsets[0].word : -1 });
      const runs = scriptRuns(seg.speech);
      if (!runs.length) { playSegment(si + 1); return; }
      runs.forEach((run, ri) => {
        const u = new (window as any).SpeechSynthesisUtterance(run.text);
        u.lang = speechLangCode(run.lang);
        u.rate = 0.92;
        u.pitch = 1.05;
        u.volume = 1;
        const voice = run.lang === 'en' ? english : voiceFor(run.lang, voices);
        if (voice) u.voice = voice;
        u.onboundary = (e: any) => {
          if (seq !== seqRef.current || !seg.offsets.length) return;
          const word = wordAt(seg.offsets, run.start + (e.charIndex ?? 0));
          setPosition({ block: seg.block, row: seg.row, word });
        };
        if (ri === runs.length - 1) u.onend = () => playSegment(si + 1);
        u.onerror = (e: any) => { if (e?.error !== 'interrupted' && e?.error !== 'canceled') finish(); };
        s.speak(u);
      });
    };
    playSegment(0);
  }, [speakingKey, stop]);

  return { speakingKey, position, toggle, stop };
}
