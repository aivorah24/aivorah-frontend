export type CurriculumStatus =
  | 'uploaded' | 'processing' | 'processed' | 'generating' | 'generated' | 'failed';

export interface TeacherCurriculum {
  id: string;
  file_name: string;
  mime_type: string;
  status: CurriculumStatus;
  error?: string | null;
}

export interface LearningPathLesson {
  title: string;
  summary: string;
}

export interface LearningPathSubtopic {
  title: string;
  order: number;
}

export interface TeacherContentBlock {
  type: string;
  [key: string]: any;
}

export interface TeacherTopicContent {
  whatYoullLearn: string[];
  blocks: TeacherContentBlock[];
  contentType?: string;
}

export interface LearningPathTopic {
  title: string | null;
  order: number;
  objectives: string[];
  lessons: LearningPathLesson[];
  subtopics: LearningPathSubtopic[];
  status?: 'ready' | 'needs_teacher_input';
  teacherHint?: string | null;
  content?: TeacherTopicContent | null;
  groundingSource?: string;
}

export interface LearningPathUnit {
  title: string | null;
  order: number;
  topics: LearningPathTopic[];
}

export interface LearningPathMetadata {
  grade?: string;
  subject?: string;
  curriculum?: string;
}

export interface LearningPathContent {
  version: number;
  metadata?: LearningPathMetadata;
  units: LearningPathUnit[];
}

export interface TeacherLearningPath {
  id: string;
  curriculum_id: string;
  status: 'draft' | 'published';
  content: LearningPathContent;
  published_content?: LearningPathContent | null;
  published_at?: string | null;
}
