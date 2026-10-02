import type { WordTiming } from '../types';
import { FUNCTION_WORDS } from './wordMatching';

// Without ElevenLabs timings, estimate each word's share of the audio from its syllables and pauses.
export function wordWeight(token: string): number {
  const clean = token.toLowerCase().replace(/[^a-z]/g, '');
  const vowelGroups = clean.match(/[aeiou]+/g);
  const raw = vowelGroups ? vowelGroups.length : 1;
  const silentE = clean.length > 2 && clean.endsWith('e') && !/[aeiou]/.test(clean[clean.length - 2]) ? 1 : 0;
  let syllables = Math.max(1, raw - silentE);
  if (FUNCTION_WORDS.has(clean)) syllables = Math.max(0.4, syllables * 0.7);
  if (/[.!?]/.test(token)) syllables += 1.5;
  else if (/[,;:—–]/.test(token)) syllables += 0.5;
  return syllables;
}

// Cumulative end position (0..1) of each word in the audio.
export function buildWordBoundaries(words: string[]): number[] {
  const weights = words.map(wordWeight);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let cum = 0;
  return weights.map((w) => { cum += w; return cum / total; });
}

export function timedWordIndex(timings: WordTiming[], currentTime: number, duration: number): number {
  let idx = 0;
  for (let i = 0; i < timings.length; i++) {
    const wordEnd = timings[i + 1]?.startTime ?? (duration + 1);
    if (currentTime >= timings[i].startTime && currentTime < wordEnd) return i;
    if (currentTime >= timings[i].startTime) idx = i;
  }
  return idx;
}

const ESTIMATE_LAG_SECONDS = 0.18;

export function estimatedWordIndex(boundaries: number[], currentTime: number, duration: number): number {
  const ratio = Math.max(0, currentTime - ESTIMATE_LAG_SECONDS) / duration;
  const found = boundaries.findIndex((b) => ratio < b);
  return found === -1 ? boundaries.length - 1 : found;
}
