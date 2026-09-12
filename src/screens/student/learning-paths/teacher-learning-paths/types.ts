export interface TeacherLearningPathSummary {
  id: string;
  curriculumId: string;
  title: string;
  publishedAt: string;
}

export interface StudentLearningPathLesson {
  title: string;
  summary: string;
}

export interface StudentLearningPathSubtopic {
  title: string;
  order: number;
}

export interface StudentLearningPathTopic {
  title: string | null;
  order: number;
  objectives: string[];
  lessons: StudentLearningPathLesson[];
  subtopics: StudentLearningPathSubtopic[];
}

export interface StudentLearningPathUnit {
  title: string | null;
  order: number;
  topics: StudentLearningPathTopic[];
}

export interface StudentLearningPathContent {
  version: number;
  units: StudentLearningPathUnit[];
}

export interface StudentTeacherLearningPath {
  id: string;
  curriculumId: string;
  publishedAt: string;
  content: StudentLearningPathContent;
}
