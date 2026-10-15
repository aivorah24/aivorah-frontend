export interface OverviewStudent {
  id: string;
  name: string;
  email: string;
  grade: string;
  curriculum: string;
  school: string;
  location: string;
  onboardingComplete: boolean;
  xpPoints: number;
  level: number;
  currentStreak: number;
  studyTimeMinutes: number;
  completedTopicsCount: number;
  hasParent: boolean;
  teacherCount: number;
  lastSeen: string | null;
}

export interface OverviewPerson {
  id: string;
  name: string;
  email: string;
  school: string;
  location: string;
}

export interface PlatformOverview {
  counts: {
    users: number;
    students: number;
    teachers: number;
    parents: number;
    totalXP: number;
    assignments: number;
    assignmentsCompleted: number;
  };
  students: OverviewStudent[];
  teachers: OverviewPerson[];
  parents: OverviewPerson[];
}

export interface SchoolDrilldownRow {
  school: string;
  students: number;
  teachers: number;
  totalXP: number;
  avgXP: number;
}

export interface ChartsData {
  roleCounts: { student: number; teacher: number; parent: number };
  curriculumMap: Record<string, number>;
  gradeMap: Record<string, number>;
  onboarding: Record<'student' | 'teacher' | 'parent', { done: number; total: number }>;
  topXP: { id: string; xp: number; studyTime: number; streak: number }[];
  assignmentStats: { total: number; completed: number; pending: number; byType: Record<string, number> };
  assignmentsLast7: { date: string; count: number }[];
}
