export interface ChildData {
  id: string;
  name: string;
  grade: string;
  curriculum?: string;
  school?: string;
  totalTopics?: number;
  status: 'on_track' | 'needs_attention' | 'getting_started';
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
