export interface Child {
  id: string;
  name: string;
  email: string;
  grade: string;
  curriculum: string;
  school?: string;
}

export interface TopicAnalytics {
  subject: string;
  grade: string;
  aiChats: number;
  avgScore: number | null;
  quizCount: number;
  minutesSpent: number;
  lastActivity: string;
  hasActivity: boolean;
}

export interface ChildReport {
  childEmail: string;
  totalMinutes: number;
  totalAIChats: number;
  avgScore: number | null;
  topicCount: number;
  topics: Record<string, TopicAnalytics>;
}

export interface SubjectMeta {
  icon: string;
  accentDark: string; accentLight: string;
  bgFromDark: string; bgToDark: string;
  bgFromLight: string; bgToLight: string;
}

export interface AttemptQuestion {
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSeconds: number | null;
}

export interface TopicAttempt {
  id: string;
  topic: string;
  subject: string;
  attemptNumber: number | null;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  createdAt: string;
  questions: AttemptQuestion[];
}
