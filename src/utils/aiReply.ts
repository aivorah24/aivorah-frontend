// Splits an AI reply into display blocks (lines, bullets, tables, dividers) and
// builds what each block should sound like when read aloud.
import { preprocessForTTS } from '../screens/student/ai-coach/utils/ttsText';

export type ReplyBlock =
  | { kind: 'line' | 'heading' | 'bullet' | 'numbered'; text: string; marker?: string }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'rule' };

const RULE_RE = /^\s*([-*_=—–]\s*){3,}$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const isTableLine = (l: string) => /^\s*\|.*\|\s*$/.test(l) || (l.split('|').length >= 3 && !/^\s*[-•*]\s/.test(l));

const splitCells = (l: string) =>
  l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => stripInline(c.trim()));

export function stripInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\s)\*(\S.*?)\*(?=\s|[.,!?]|$)/g, '$1$2')
    .replace(/`+/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

export function parseAIReply(text: string): ReplyBlock[] {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks: ReplyBlock[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    // Image markdown and [Image: …] placeholders are shown separately, never as text.
    const t = raw.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[(image|diagram|figure)[^\]]*\]/gi, '').trim();
    if (!t) continue;
    if (RULE_RE.test(t)) { blocks.push({ kind: 'rule' }); continue; }
    // A table needs a header row followed by a |---| separator row.
    if (isTableLine(t) && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1].trim()) && lines[i + 1].includes('-')) {
      const header = splitCells(t);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && isTableLine(lines[i].trim())) {
        if (!TABLE_SEP_RE.test(lines[i].trim())) rows.push(splitCells(lines[i]));
        i += 1;
      }
      i -= 1;
      blocks.push({ kind: 'table', header, rows });
      continue;
    }
    const heading = t.match(/^#{1,6}\s+(.*)$/);
    if (heading) { blocks.push({ kind: 'heading', text: heading[1] }); continue; }
    const bullet = t.match(/^[-•*]\s+(.*)$/);
    if (bullet) { blocks.push({ kind: 'bullet', text: bullet[1] }); continue; }
    const numbered = t.match(/^(\d+[.)])\s+(.*)$/);
    if (numbered) { blocks.push({ kind: 'numbered', text: numbered[2], marker: numbered[1] }); continue; }
    blocks.push({ kind: 'line', text: t });
  }
  return blocks;
}

// Display words of a text block (markdown removed); bold runs are kept as flags.
export function blockWords(text: string): { word: string; bold: boolean }[] {
  const out: { word: string; bold: boolean }[] = [];
  const parts = text.split(/(\*\*.+?\*\*)/g);
  for (const p of parts) {
    const bold = /^\*\*.+\*\*$/.test(p);
    for (const w of stripInline(p).split(/\s+/)) if (w) out.push({ word: w, bold });
  }
  return out;
}

const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{20E3}\u{200D}]/gu;

// How one display word should be spoken; '' means skip it (dashes, pipes, emoji…).
export function spokenWord(word: string): string {
  if (/^\(?(https?:\/\/|www\.)/i.test(word)) return '';
  const w = word
    .replace(/[\d#*]\u{FE0F}?\u{20E3}/gu, '')
    .replace(EMOJI_RE, '')
    .replace(/[→⇒]|->|=>/g, ' to ')
    .replace(/[|#*_~^`]+/g, '')
    .replace(/^[-–—]+$|^[-–—]{2,}|[-–—]{2,}$/g, '')
    .trim();
  if (!w || !/[\p{L}\p{N}]/u.test(w)) return '';
  return preprocessForTTS(w).trim();
}

export type SpeechSegment = { block: number; row?: number; speech: string; offsets: { start: number; word: number }[] };

const speakCell = (s: string) => s.split(/\s+/).map(spokenWord).filter(Boolean).join(' ');

// One segment per line, and one per table row ("Header: value, Header: value."),
// so each is spoken as its own utterance and highlighted while it plays.
export function replySegments(blocks: ReplyBlock[]): SpeechSegment[] {
  const out: SpeechSegment[] = [];
  blocks.forEach((b, bi) => {
    if (b.kind === 'rule') return;
    if (b.kind === 'table') {
      b.rows.forEach((r, ri) => {
        const speech = r.map((cell, ci) => {
          const h = b.header[ci] ? speakCell(b.header[ci]) : '';
          const c = speakCell(cell);
          return h && c ? `${h}: ${c}` : c;
        }).filter(Boolean).join(', ');
        if (speech) out.push({ block: bi, row: ri, speech: speech + '.', offsets: [] });
      });
      return;
    }
    const s = textSpeech(b.text);
    if (s.speech) out.push({ block: bi, ...s });
  });
  return out;
}

// Speech for a text block plus, for each spoken word, which display word it belongs to.
export function textSpeech(text: string): { speech: string; offsets: { start: number; word: number }[] } {
  const words = blockWords(text);
  let speech = '';
  const offsets: { start: number; word: number }[] = [];
  words.forEach((w, wi) => {
    const s = spokenWord(w.word);
    if (!s) return;
    if (speech) speech += ' ';
    offsets.push({ start: speech.length, word: wi });
    speech += s;
  });
  return { speech, offsets };
}

export function wordAt(offsets: { start: number; word: number }[], charIndex: number): number {
  let cur = -1;
  for (const o of offsets) { if (o.start <= charIndex) cur = o.word; else break; }
  return cur;
}
