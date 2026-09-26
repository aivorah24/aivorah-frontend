export type Mode = 'read' | 'listen' | 'ask' | 'practice';

export type PlayLine = {
  speaker: string;
  text: string;
  direction?: string;
  stage?: boolean;
  card?: number | null;
};

export type ListenStep = {
  label: string;
  heading: string;
  text: string;
  lines?: PlayLine[];
  keyIdea?: string;
  pauseThink?: { question: string; options: string[]; correctIndex: number };
};
