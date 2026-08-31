// Shapes returned by the parent/children endpoints. Deliberately loose —
// the backend returns a superset of these fields and the screen only reads
// the ones listed here.
export interface Child {
  id: string;
  name: string;
  email?: string;
  grade?: string;
  curriculum?: string;
  school?: string;
  xpPoints?: number;
  level?: number;
  currentStreak?: number;
  studyTime?: number;
  todayStudyMinutes?: number;
  totalTopics?: number;
  completedTopics?: string[];
  lastLesson?: string;
  assignmentsDone?: number;
  [key: string]: any;
}

export interface ChildCredentials {
  loginId: string | null;
  studentId: string | null;
  initialPassword: string | null;
}

export interface ParentTask {
  id: string;
  label: string;
  icon?: string;
  coins?: number;
  [key: string]: any;
}
