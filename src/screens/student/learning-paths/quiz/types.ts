export type Question = {
  // 'spoken': the last question of every practice test - the student explains
  // the topic in their own words (speech-to-text), graded by
  // POST /ibpyp/evaluate-explanation.
  type: 'mcq' | 'fill_blank' | 'spoken';
  question: string;
  options: string[];
  correct: number | string; // index for mcq, string for fill_blank
  hint: string;
  explanation: string;
};

// 'hub': the Practice start page (Take a Test / History) - see QuizScreen.
export type QuizPhase = 'hub' | 'loading' | 'quiz' | 'result';

// POST /ibpyp/evaluate-explanation's answer for the spoken question.
export type SpokenEvaluation = {
  score: number;      // 0-10
  outOf: number;      // 10
  passed: boolean;    // score >= 6: counts as a correct answer
  verdict: 'excellent' | 'good' | 'partial' | 'needs_work';
  covered: string[];
  missing: string[];
  mistakes: string[];
  feedback: string;
};

export type SpokenStatus = 'idle' | 'checking' | 'error';
