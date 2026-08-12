export interface CurriculumTopic {
  grade: string;
  subject: string;
  unit: string;
  topic: string;
  content_type: string;
}

export interface CurriculumData {
  grades: string[];
  topics: CurriculumTopic[];
  grouped: Record<string, Record<string, { topic: string; unit: string }[]>>;
  totalTopics: number;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  date: string;
  note: string;
}

export interface TopicPerf {
  avgScore: number | null;
  quizCount: number;
  sessions: number;
  lastActivity?: string;
}

export interface PerfData {
  topics: Record<string, TopicPerf>;
  avgScore: number | null;
}

export interface SubjectChapters {
  subject: string;
  chapters: string[];
}
