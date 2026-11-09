export interface OnThisDay { year: number; fact: string }
export interface FunChallenge { question: string; answer: string }
export interface WorldData {
  onThisDay: OnThisDay[];
  funChallenge: FunChallenge;
  date: string;
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
  currentAffairs: CurrentAffair;
}
