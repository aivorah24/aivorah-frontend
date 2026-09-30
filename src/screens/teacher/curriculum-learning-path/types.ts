export type CurriculumStatus =
  | 'uploaded' | 'processing' | 'processed' | 'generating' | 'generated' | 'failed';

export type CurriculumStage = 'queued' | 'extracting' | 'analysing' | 'generating' | 'saving' | 'done' | 'failed';

export interface CurriculumProgress {
  stage: CurriculumStage;
  topicsDone: number | null;
  topicsTotal: number | null;
  updatedAt: string;
}

export type UploadPhase = 'idle' | 'uploading' | 'upload_failed' | 'tracking';

export interface TeacherCurriculum {
  id: string;
  file_name: string;
  mime_type: string;
  status: CurriculumStatus;
  error?: string | null;
  progress?: CurriculumProgress | null;
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

export interface TeacherTopicBook {
  pdfFile: string;
  bookPath: string | null;
  bookTitle: string | null;
  chapterTitle: string;
  pdfPage: number;
  confidence: number;
  grade?: number;
  pages?: TeacherBookPage[];
}

// One entry per subtopic; pdfFile null = no NCERT section teaches it.
export interface TeacherBookPage {
  subtopic: string;
  pdfFile: string | null;
  bookPath?: string | null;
  bookTitle?: string | null;
  chapterTitle?: string | null;
  grade?: number;
  pdfPage?: number;
  section?: string;
  sections?: { pdfFile: string; title: string; page: number; grade: number }[];
}

// The book's AI Tutor script (Maths): the student AI Tutor tab plays one step per example.
export interface TeacherMathTutorExample {
  title?: string;
  problem: string;
  steps: { say: string; show?: string }[];
  answer: string;
  why?: string;
  hint?: string;
  page?: number;
  yourTurn?: { question: string; answer: string };
}

export interface TeacherMathTutor {
  intro?: string;
  keyIdea?: string;
  examples: TeacherMathTutorExample[];
}

export interface TeacherPauseThink {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TeacherListenPart {
  heading: string;
  text: string;
  keyIdea?: string;
  pauseThink?: TeacherPauseThink;
}

export interface TeacherPracticeQuestion {
  type: 'mcq' | 'fill_blank';
  question: string;
  options: string[];
  correct: number | string;
  hint?: string;
  explanation?: string;
}

export interface TeacherTopicContent {
  whatYoullLearn: string[];
  blocks: TeacherContentBlock[];
  contentType?: string;
  book?: TeacherTopicBook;
  listenParts?: TeacherListenPart[];
  practiceQuiz?: TeacherPracticeQuestion[];
  mathTutor?: TeacherMathTutor;
  aiWrittenSubtopics?: string[];
}

export interface TopicQuality {
  readingGrade: number;
  sentenceLength: number;
  judgeScores: Record<string, { ageAppropriate: number; matchesChapter: number; factuallySound: number; clearExamples: number }> | null;
  issues: string[];
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
  quality?: TopicQuality | null;
}

export interface LearningPathUnit {
  title: string | null;
  order: number;
  topics: LearningPathTopic[];
}

export interface LearningPathMetadata {
  // The teacher's name for the path, shown to students; defaults to "Grade 6 Mathematics".
  title?: string;
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
  updated_at?: string | null;
}

// One row of the teacher's "My Learning Paths" list.
export interface MyLearningPathSummary {
  id: string;
  curriculumId: string;
  title: string;
  fileName: string | null;
  grade: string | null;
  subject: string | null;
  status: 'draft' | 'published';
  updatedAt: string;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
}
