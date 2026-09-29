export interface TeacherLearningPathSummary {
  id: string;
  curriculumId: string;
  title: string;
  grade?: string | null;
  subject?: string | null;
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

// The structured AI-generated content for a topic (services/curriculum/
// blockSchema.js block shapes) — present when the topic was grounded in
// real NCERT/vector content or the upload-text batch path; null/absent for
// a topic still awaiting generation. Consumed directly by LessonScreen's
// ReadTab/ListenTab via adaptTeacherContentToTopic — kept loosely typed
// here (block shapes are validated server-side) rather than duplicating
// the full block union.
export interface StudentLearningPathTopicContent {
  whatYoullLearn: string[];
  blocks: { type: string; [key: string]: unknown }[];
  contentType?: string;
}

export interface StudentLearningPathTopic {
  title: string | null;
  order: number;
  objectives: string[];
  lessons: StudentLearningPathLesson[];
  subtopics: StudentLearningPathSubtopic[];
  content?: StudentLearningPathTopicContent | null;
  groundingSource?: string;
}

export interface StudentLearningPathUnit {
  title: string | null;
  order: number;
  topics: StudentLearningPathTopic[];
}

// grade/subject/curriculum as extracted from the uploaded curriculum
// document (see normalization.js's extractMetadata) — needed to open a
// topic's Learn/AI Tutor/Ask Aivorah/Practice flow (LessonScreen), which
// requires all three.
export interface StudentLearningPathMetadata {
  grade?: string;
  subject?: string;
  curriculum?: string;
}

export interface StudentLearningPathContent {
  version: number;
  metadata?: StudentLearningPathMetadata;
  units: StudentLearningPathUnit[];
}

export interface StudentTeacherLearningPath {
  id: string;
  curriculumId: string;
  publishedAt: string;
  content: StudentLearningPathContent;
}
