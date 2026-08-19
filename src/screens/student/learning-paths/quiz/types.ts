export type Question = {
  type: 'mcq' | 'fill_blank';
  question: string;
  options: string[];
  correct: number | string; // index for mcq, string for fill_blank
  hint: string;
  explanation: string;
};

export type QuizPhase = 'loading' | 'quiz' | 'result';
