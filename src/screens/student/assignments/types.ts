export interface Assignment {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  dueDate: string;
  type: string;
  note: string;
  studentId: string | null;
  createdBy: string;
  status: 'pending' | 'completed';
  score: number | null;
  createdAt: string;
  completedAt?: string;
  grade?: string | null;
  curriculum?: string | null;
  questions: string[];
  aiFeedback?: string | null;
  documentUrl?: string | null;
  documentUrls?: string[];
  successCriteria?: string[];
  taskSteps?: TaskStep[];
  quizQuestions?: QuizQuestion[];
  centralIdea?: string | null;
  linesOfInquiry?: string[];
  joinedAfterDue?: boolean;
  learnerProfile?: string | null;
  atlSkill?: string | null;
  keyConcept?: string | null;
  interactiveQuizHtml?: string | null;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'short_answer' | 'fill_blank';
  options?: string[];
  correct: string;
  hint?: string;
  explanation?: string;
}

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
  provocation?: string;           // tuning_in: the real-world scenario
  sections?: string[];
  wordBank?: string[];
  problems?: string[];            // problem_solving: maths problems
  reflectionPrompts?: string[];   // math_reflection: 3 prompts
}

export type StepAnswer = {
  stepId: string;
  type: StepType;
  keywords: string[];
  drawingBase64: string | null;
  drawingMime: string;
  sections: { label: string; text: string }[];
  problemAnswers?: string[];      // problem_solving
  tunedInText?: string;           // tuning_in (generic)
  noticeWonderKnow?: { notice: string; wonder: string; know: string }; // social_inquiry / tuning_in / text_connection
  reflectionAnswers?: string[];   // math_reflection
  priorKnowledge?: { knows: string; predicts: string }; // prior_knowledge
};

export type PageAnswer = { preview: string | null; base64: string | null; mime: string };
export type PerQ = { number: number; question: string; answered: boolean; score: number | null; needsReview?: boolean; studentAnswer: string | null; correct: boolean; comment: string };
export type GradeResult = { score: number | null; feedback: string; stamp: string; wellDone: string; improve: string; perQuestion: PerQ[]; teacherFeedback?: string };
