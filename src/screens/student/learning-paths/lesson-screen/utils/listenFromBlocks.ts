import type { ListenStep } from '../types';

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

const withStop = (s: string) => (/[.!?…]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

// A lesson with a "reasoning flow" process block (e.g. Action -> Evidence -> Thought -> Reasoning -> Conclusion)
// is narrated one card at a time, so the right-hand board can follow the audio. Anything else returns null
// and keeps the existing Listen behaviour.
export function buildReasoningListen(rawPayload: any): ReasoningListen | null {
  const blocks: Block[] = Array.isArray(rawPayload?.blocks) ? rawPayload.blocks : [];
  const flow = blocks.find(
    (b) => b.type === 'process' && Array.isArray(b.steps) && b.steps.length >= 3 && b.steps.length <= 7 && /reasoning|logic|chain|flow/i.test(String(b.title || '')),
  );
  if (!flow) return null;

  const cards: ChainCard[] = (flow.steps as string[]).map((s, i) => {
    const m = /^\s*([A-Za-z][A-Za-z ]{1,20}?)\s*:\s*(.+)$/.exec(String(s));
    return m ? { label: m[1].trim(), text: m[2].trim() } : { label: `Step ${i + 1}`, text: String(s).trim() };
  });

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
