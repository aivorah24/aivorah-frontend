import type { WordStatus } from '../types';
import { FUNCTION_WORDS, fuzzyMatch, normalize } from './wordMatching';

// Read-Along alignment: the passage is known, so for each new spoken word we only ask whether it is
// the next expected word (or a content word a few ahead, meaning words were skipped). Noise never
// matches, so the highlight waits instead of racing ahead.

export const UNKNOWN_WORD = '⍰'; // Vosk's [unk]: off-script speech, likely a mispronunciation
const LONG_WORD_LEN = 7;

export interface Marks {
  skipped: number[];
  misread: number[];
}

export interface FollowState {
  cursor: number;            // authoritative position shown to the reader
  scanPos: number;           // where alignment has reached (runs ahead of `cursor` while a long word is held)
  pending: ({ pos: number } & Marks) | null;
  lastSpoken: string[];
  misreadCandidates: Set<number>;
}

export function newFollowState(): FollowState {
  return { cursor: 0, scanPos: 0, pending: null, lastSpoken: [], misreadCandidates: new Set() };
}

export interface Advance extends Marks {
  to: number;
}

// `holdLongWords`: Vosk's passage grammar can "snap" to a long word on its first syllable, so a long
// word is held one recognizer emission before it is painted correct. Web Speech has no such snap.
export function followAlong(state: FollowState, passageWords: string[], spoken: string[], holdLongWords: boolean): Advance | null {
  if (!spoken.length || !passageWords.length) return null;
  const cursor = state.cursor;
  if (cursor >= passageWords.length) return null;

  // Recognizers resend the whole transcript so far; only the tail beyond the common prefix is new.
  const prev = state.lastSpoken;
  let lcp = 0;
  while (lcp < Math.min(prev.length, spoken.length) && prev[lcp] === spoken[lcp]) lcp++;
  const newWords = spoken.slice(lcp);
  state.lastSpoken = spoken;
  const pending = state.pending;

  if (!newWords.length) {
    // Surviving an unchanged re-emission confirms a held long word.
    if (!pending) return null;
    state.pending = null;
    return { to: state.scanPos, skipped: pending.skipped, misread: pending.misread };
  }

  const isCommon = (w: string) => FUNCTION_WORDS.has(w) || w.length <= 3;
  const skipped = pending ? pending.skipped.slice() : [];
  const misread = pending ? pending.misread.slice() : [];
  let pi = pending ? state.scanPos : cursor;
  let held = pending;

  for (const word of newWords) {
    if (word === UNKNOWN_WORD) {
      state.misreadCandidates.add(pi);
      continue;
    }
    if (pi >= passageWords.length) break;
    // Common words must be the very next word; content words may bridge a short skip.
    const window = isCommon(word) ? 1 : 4;
    let found = -1;
    for (let d = 0; d <= window && pi + d < passageWords.length; d++) {
      if (fuzzyMatch(word, normalize(passageWords[pi + d]))) { found = d; break; }
    }
    if (found < 0) continue;

    const matchedPos = pi + found;
    const expected = normalize(passageWords[matchedPos]);
    if (holdLongWords && found === 0 && expected.length >= LONG_WORD_LEN && (held === null || held.pos !== matchedPos)) {
      held = { pos: matchedPos, skipped: skipped.slice(), misread: misread.slice() };
      pi = matchedPos + 1;
      continue;
    }
    if (held !== null && held.pos === matchedPos) {
      pi = matchedPos + 1;
      continue;
    }
    for (let k = pi; k < matchedPos; k++) {
      if (!/[a-z]/i.test(passageWords[k])) continue;
      if (held !== null && k === held.pos) continue;
      if (state.misreadCandidates.has(k)) misread.push(k);
      else skipped.push(k);
    }
    if (held !== null && matchedPos > held.pos) held = null;
    pi = matchedPos + 1;
  }

  // A hold carried in from the previous emission has now survived one more: confirm it.
  if (held !== null && held === pending) held = null;

  state.scanPos = pi;
  state.pending = held;
  const to = held ? held.pos : pi;
  if (to <= cursor) return null;
  return {
    to,
    skipped: held ? skipped.filter((k) => k < held!.pos) : skipped,
    misread: held ? misread.filter((k) => k < held!.pos) : misread,
  };
}

// Statuses after the reader reaches `to`; null when that isn't forward progress.
export function advanceStatuses(target: WordStatus[], passageWords: string[], cursor: number, to: number, marks?: Partial<Marks>): { pos: number; statuses: WordStatus[] } | null {
  const total = passageWords.length;
  if (to <= cursor) return null;
  let pos = Math.min(to, total);
  // Never rest the cursor on a punctuation-only token such as "—".
  while (pos < total && !/[a-z]/i.test(passageWords[pos])) pos++;
  const statuses: WordStatus[] = target.length === total ? target.slice() : new Array(total).fill('pending');
  for (let i = 0; i < pos; i++) {
    if (statuses[i] === 'pending' || statuses[i] === 'current') {
      statuses[i] = marks?.misread?.includes(i) ? 'misread' : marks?.skipped?.includes(i) ? 'skipped' : 'correct';
    }
  }
  if (pos < total) statuses[pos] = 'current';
  return { pos, statuses };
}

// One animation frame of the visible cursor gliding toward `target` (half the gap per frame).
export function revealFrame(targetStatuses: WordStatus[], display: number, target: number): { display: number; visible: WordStatus[] } | null {
  const total = targetStatuses.length;
  if (!total || display >= target) return null;
  const next = Math.min(target, display + Math.max(1, Math.ceil((target - display) / 2)));
  const visible = targetStatuses.slice();
  for (let i = next + 1; i < total; i++) visible[i] = 'pending';
  if (next < total) visible[next] = 'current';
  return { display: next, visible };
}

export function initialStatuses(count: number, markFirstCurrent: boolean): WordStatus[] {
  const statuses: WordStatus[] = new Array(count).fill('pending');
  if (markFirstCurrent && count > 0) statuses[0] = 'current';
  return statuses;
}
