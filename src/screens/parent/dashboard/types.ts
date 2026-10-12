import type { StudentStatus } from '../../../utils/studentStatus';

export interface ChildData {
  id: string;
  name: string;
  grade: string;
  curriculum?: string;
  school?: string;
  totalTopics?: number;
  status: StudentStatus;
  lastActive?: string | null;
  xpPoints: number;
  completedTopics: string[];
  currentStreak: number;
  studyTimeMinutes: number;
  assignmentsDone: number;
  challengesCompleted: number;
  lastLesson?: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: 'pending' | 'completed';
}
