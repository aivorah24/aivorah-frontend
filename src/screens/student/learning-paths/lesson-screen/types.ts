export type Mode = 'read' | 'listen' | 'ask' | 'practice';

export type PlayLine = {
  speaker: string;
  text: string;
  direction?: string;
  stage?: boolean;
  card?: number | null;
  page?: number;
  audio?: string;
};

type Titled = { title?: string };
export type SceneVisual = Titled & (
  | { kind: 'image'; url: string; caption?: string; page?: number }
  | { kind: 'flow'; steps: string[] }
  | { kind: 'venn'; left: { label: string; items: string[] }; right: { label: string; items: string[] }; both: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'timeline'; events: { when: string; what: string }[] }
  | { kind: 'cause_effect'; pairs: { cause: string; effect: string }[] }
  | { kind: 'compare'; columns: { label: string; points: string[] }[] }
  | { kind: 'web'; center: string; nodes: { label: string; note?: string }[] }
);

export type MathStep = {
  problem: string;
  shows: string[];
  answer: string;
  why?: string;
  hint?: string;
  page?: number;
  yourTurn?: { question: string; answer: string };
};

export type ListenStep = {
  label: string;
  heading: string;
  text: string;
  lines?: PlayLine[];
  visual?: SceneVisual;
  math?: MathStep;
  keyIdea?: string;
  pauseThink?: { question: string; options: string[]; correctIndex: number };
};
