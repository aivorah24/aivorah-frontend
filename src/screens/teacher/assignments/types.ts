export type Assignment = {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  dueDate: string;
  type: 'assignment' | 'quiz';
  note: string;
  studentId: string | null;
  createdBy: string;
  status: 'pending' | 'completed';
  score: number | null;
  createdAt: string;
  completedAt?: string | null;
  grade?: string | null;
  curriculum?: string | null;
  aiFeedback?: string | null;
  questions?: any[];
  quizQuestions?: any[];
  taskSteps?: any[];
  successCriteria?: string[];
  documentUrls?: string[];
};

export interface StudentItem { id: string; name: string; grade: string; curriculum?: string | null; }

export type StepType =
  | 'brainstorm' | 'drawing' | 'structured_writing' | 'problem_solving'
  | 'tuning_in' | 'math_reflection' | 'prior_knowledge'
  | 'text_connection' | 'reading_comprehension' | 'writing_reflection'
  | 'language_culture' | 'language_practice' | 'communication'
  | 'social_inquiry' | 'research_notes' | 'social_synthesis'
  | 'artistic_exploration' | 'art_creation' | 'artistic_reflection'
  | 'digital_awareness' | 'tech_skill_practice' | 'digital_citizenship'
  | 'movement_exploration' | 'skill_practice' | 'physical_reflection';

export interface TaskStep {
  id: string;
  type: StepType;
  label: string;
  instructions: string;
  sections: string[];
  wordBank: string[];
  problems?: string[];
  reflectionPrompts?: string[];
  provocation?: string;
}

export type BulkItem = {
  id: string; name: string; mime: string; base64: string;
  pages: { name: string; base64: string; mime: string }[];
  status: 'extracting' | 'ready' | 'error'; error?: string;
  title: string; subject: string; grade: string; curriculum: string; chapter: string; language: string;
  // mammoth's docx->HTML converted to plain text with exact table cells
  // preserved (see docxToPdf on the assignments-service) — ground truth
  // for quiz generation on docx-sourced items, fixing a bug where table
  // numbers were fabricated instead of read from the source.
  structuredText?: string;
  quiz: any | null; quizHtml: string; quizStatus: 'idle' | 'generating' | 'done' | 'error'; quizError?: string;
  assignTo: 'all' | 'specific'; selectedStudentId: string | null;
  publishStatus: 'idle' | 'publishing' | 'done' | 'error'; publishError?: string;
};
