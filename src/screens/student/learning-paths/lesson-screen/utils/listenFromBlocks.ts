import type { ListenStep, PlayLine } from '../types';
import { parseSceneVisual } from './sceneVisual';

export type ChainCard = { label: string; text: string };

export type ReasoningListen = {
  steps: ListenStep[];
  cards: ChainCard[];
  // For each listen step: the index of the matching chain card, or null (intro, book excerpt, key words...).
  stepToCard: (number | null)[];
  // Original textbook sentence(s) for the follow-along view, when the lesson has a prose excerpt.
  bookQuote?: string;
};

type Block = { type: string; [key: string]: any };

const cleanLines = (raw: any): PlayLine[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const lines = raw
    .filter((l) => l && typeof l.speaker === 'string' && typeof l.text === 'string' && l.text.trim())
    .map((l): PlayLine => ({
      speaker: l.speaker,
      text: l.text.trim(),
      ...(typeof l.direction === 'string' && l.direction.trim() ? { direction: l.direction.trim() } : {}),
      ...(l.stage ? { stage: true } : {}),
      ...(Number.isInteger(l.card) ? { card: l.card } : {}),
      ...(Number.isInteger(l.page) && l.page > 0 ? { page: l.page } : {}),
      ...(typeof l.audio === 'string' && /^https:\/\//.test(l.audio) ? { audio: l.audio } : {}),
    }));
  return lines.length ? lines : undefined;
};

const withStop = (s: string) => (/[.!?…]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

// A lesson with a "reasoning flow" process block (e.g. Action -> Evidence -> Thought -> Reasoning -> Conclusion)
// is narrated one card at a time, so the right-hand board can follow the audio. Anything else returns null
// and keeps the existing Listen behaviour.
export function buildReasoningListen(rawPayload: any): ReasoningListen | null {
  const blocks: Block[] = Array.isArray(rawPayload?.blocks) ? rawPayload.blocks : [];
  const flow = blocks.find(
    (b) => b.type === 'process' && Array.isArray(b.steps) && b.steps.length >= 3 && b.steps.length <= 7 && /reasoning|logic|chain|flow/i.test(String(b.title || '')),
  );
  // A saved narration script ([{ card, heading, text, lines? }]) is a full spoken explanation, so prefer it over
  // reading the card lines back. `card` says which visual card the step explains (null = none).
  const savedScript = Array.isArray(rawPayload?.listenScript)
    ? (rawPayload.listenScript as any[]).filter((s) => s && typeof s.heading === 'string' && typeof s.text === 'string' && s.text.trim())
    : [];
  // A piece read aloud (story, essay, poem) has no reasoning chain: it still gets the script and the book.
  if (!flow && !savedScript.some((s) => cleanLines(s.lines))) return null;

  const cards: ChainCard[] = flow ? (flow.steps as string[]).map((s, i) => {
    const m = /^\s*([A-Za-z][A-Za-z ]{1,20}?)\s*:\s*(.+)$/.exec(String(s));
    return m ? { label: m[1].trim(), text: m[2].trim() } : { label: `Step ${i + 1}`, text: String(s).trim() };
  }) : [];

  // A saved narration script ([{ card, heading, text }]) is a full spoken explanation, so prefer it over
  // reading the card lines back. `card` says which visual card the step explains (null = none).
  const script = savedScript;
  if (script.length) {
    const bookQuote = blocks.find((b) => b.type === 'prose_excerpt' && b.sourceText)?.sourceText;
    return {
      steps: script.map((s) => {
        const lines = cleanLines(s.lines);
        const visual = parseSceneVisual(s.visual);
        return { label: s.heading, heading: s.heading, text: withStop(s.text), ...(lines ? { lines } : {}), ...(visual ? { visual } : {}) };
      }),
      cards,
      stepToCard: script.map((s) => (Number.isInteger(s.card) && s.card >= 0 && s.card < cards.length ? s.card : null)),
      bookQuote,
    };
  }

  const steps: ListenStep[] = [];
  const stepToCard: (number | null)[] = [];
  const push = (step: ListenStep, card: number | null) => { steps.push(step); stepToCard.push(card); };

  const overview = blocks.find((b) => b.type === 'overview' && b.text);
  if (overview) push({ label: 'Introduction', heading: 'Introduction', text: withStop(overview.text) }, null);

  const excerpt = blocks.find((b) => b.type === 'prose_excerpt' && b.sourceText);
  if (excerpt) {
    const text = [`Here is what the book says. ${withStop(excerpt.sourceText)}`, excerpt.explanation ? withStop(excerpt.explanation) : ''].filter(Boolean).join(' ');
    push({ label: 'From the book', heading: 'From the book', text }, null);
  }

  cards.forEach((c, i) => push({ label: c.label, heading: `${i + 1}. ${c.label}`, text: withStop(`${c.label}. ${c.text}`) }, i));

  const deeper = blocks.find((b) => b.type === 'key_points' && Array.isArray(b.items) && b.items.length);
  if (deeper) {
    const q = String(deeper.items[0]).replace(/^\s*deep-dive question\s*:\s*/i, '');
    push({ label: 'Think deeper', heading: 'Think deeper', text: withStop(q) }, null);
  }

  const terms = blocks.find((b) => b.type === 'key_terms' && Array.isArray(b.items) && b.items.length);
  if (terms) {
    const text = terms.items.map((t: any) => withStop(`${t.term} means ${String(t.definition).split(/\s*Context clue:/i)[0]}`)).join(' ');
    push({ label: 'Key words', heading: 'Key words', text }, null);
  }

  return { steps, cards, stepToCard, bookQuote: excerpt?.sourceText };
}
