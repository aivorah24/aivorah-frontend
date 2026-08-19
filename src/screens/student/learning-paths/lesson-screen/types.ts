export type Mode = 'read' | 'listen' | 'ask' | 'practice';

export type ListenStep = {
  label: string;
  heading: string;
  text: string;
  keyIdea?: string;
  pauseThink?: { question: string; options: string[]; correctIndex: number };
};
