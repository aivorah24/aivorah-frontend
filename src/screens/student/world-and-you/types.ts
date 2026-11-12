export interface OnThisDay { year: number; fact: string }
export interface FunChallenge { question: string; answer: string }
export interface WorldData {
  onThisDay: OnThisDay[];
  funChallenge: FunChallenge;
  date: string;
  /** true = a ready-made puzzle while the AI is still writing today's. */
  partial?: boolean;
}

export interface GKFact {
  fact: string;
  category: string;
}
export interface CurrentAffair {
  headline: string;
  summary: string;
}
export interface TidbitData {
  grade: string;
  date: string;
  gk: GKFact;
  /** Only when asked with currentAffairs=1 (the app no longer shows it). */
  currentAffairs?: CurrentAffair | null;
  /** true = a ready-made fact while the AI is still writing today's. */
  partial?: boolean;
}
