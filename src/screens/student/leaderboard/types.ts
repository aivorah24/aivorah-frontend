export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  grade: string;
  score: number;
  level: number;
  streak: number;
  topics: number;
}

export type Scope = 'school' | 'grade' | 'curriculum' | 'overall';
