import type { StudentStatus } from '../../../utils/studentStatus';

export type Student = {
  id: string;
  name: string;
  email: string;
  grade: string;
  subject: string;
  curriculum: string;
  xpPoints: number;
  level: number;
  currentStreak: number;
  studyTime: number;
  completedTopics: string[];
  progressPct: number;
  assignmentsDone: number;
  lastActive: string;
  needsAttention: boolean;
  status?: StudentStatus;
  photoUrl?: string;
  createdAt?: string | null;
  hasStarted?: boolean;
};

export type AddTab = 'create' | 'link' | 'bulk';

export interface StudentStats {
  total: number;
  onTrack: number;
  attention: number;
  activeToday: number;
  inactive: number;
  streakRisk: number;
  topPerformers: number;
  avgProgress: number;
}

export interface Teaches {
  grade: string;
  curriculum: string;
}
