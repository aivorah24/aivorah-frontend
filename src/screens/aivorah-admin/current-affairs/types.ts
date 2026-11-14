export type ContentStatus = 'draft' | 'review' | 'published' | 'rejected' | 'archived';
export type CaAgeGroup = 'under-8' | '8-12' | '13+';
export const CA_CATEGORIES = ['india', 'world', 'economy', 'science', 'environment', 'sports', 'society'] as const;
export type CaCategory = (typeof CA_CATEGORIES)[number];

/** A row in the stories list. */
export interface StorySummary {
  id: string;
  category: CaCategory;
  publish_date: string;
  status: ContentStatus;
  priority: number;
  title_kid: string;
  summary_kid: string;
  source: string;
  source_url: string | null;
  review_notes: string | null;
  is_true_fact: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

/** Every editable field of a story (ca_stories). */
export interface Story extends StorySummary {
  title_young: string; title_teen: string;
  summary_young: string; summary_teen: string;
  what_happened_young: string; what_happened_kid: string; what_happened_teen: string;
  why_important_young: string; why_important_kid: string; why_important_teen: string;
  did_you_know: string | null;
  new_word_1: string | null; def_1: string | null;
  new_word_2: string | null; def_2: string | null;
  new_word_3: string | null; def_3: string | null;
  think_about_it: string | null;
  image_url: string | null;
}

export interface QuizQuestion {
  id: string;
  week_start: string;
  age_group: CaAgeGroup;
  category: CaCategory;
  question_type: 'mcq' | 'true_false' | 'reasoning';
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  extra_fact: string | null;
  status: ContentStatus;
  position: number;
  review_notes: string | null;
}

export interface QuizWeek {
  weekStart: string;
  ageGroup: CaAgeGroup;
  counts: Partial<Record<ContentStatus, number>>;
}

export interface Metric { value: number | null; unit: string; [extra: string]: unknown }

export interface CaAnalytics {
  range: { from: string; to: string; days: number; ageGroup: string };
  activeStudents: number;
  metrics: {
    digestCompletionRate: Metric;
    avgReadingSeconds: Metric;
    avgMinutesPerDay: Metric;
    quizParticipation: Metric;
    quizAccuracy: Metric;
    retention30: Metric;
    dailyActiveReaders: Metric;
    avgStreak: Metric;
  };
  daily: { date: string; readers: number; storiesRead: number; digestsCompleted: number }[];
}
