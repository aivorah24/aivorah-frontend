import CURRENT_AFFAIRS_SERVER_URL from '../config/currentAffairsServerUrl';
import { authHeader } from './authHeader';

// Client for aivorah-current-affairs-service: daily digest, stories, weekly quiz,
// points/streaks/badges. Every function throws on a non-2xx answer, with the
// service's error message when it sends one.
//
// Reads that name a student go through the global authFetch wrapper, which adds
// the Firebase token on its own; writes attach it explicitly with authHeader()
// so they fail fast ("Not signed in.") instead of being refused by the service.

export type AgeGroup = 'under-8' | '8-12' | '13+';
export type Category = 'india' | 'world' | 'economy' | 'science' | 'environment' | 'sports' | 'society';
export type QuestionType = 'mcq' | 'true_false' | 'reasoning';
export type BadgeKey = 'excellence' | 'weekly_streak' | 'growth';

export interface NewWord {
  word: string;
  definition: string;
}

export interface Story {
  id: string;
  category: Category;
  publishDate: string;
  title: string;
  summary: string;
  whatHappened: string;
  whyImportant: string;
  didYouKnow: string | null;
  newWords: NewWord[];
  thinkAboutIt: string | null;
  imageUrl: string | null;
  source: string;
  sourceUrl: string | null;
  readTimeSeconds: number;
  /** Only in a digest fetched with studentEmail. */
  read?: boolean;
}

export interface Digest {
  /** The digest's day; null when nothing has been published yet. */
  date: string | null;
  /** false when today has no stories yet and this is the latest earlier digest. */
  isToday: boolean;
  ageGroup: AgeGroup;
  /** Stories per day for the age group (3 / 10 / 18). */
  target: number;
  stories: Story[];
  readCount: number;
  /** Today's digest already marked complete by this student. */
  completed: boolean;
}

export interface DigestDate {
  date: string;
  storyCount: number;
}

export interface QuizQuestion {
  id: string;
  category: Category;
  type: QuestionType;
  question: string;
  options: string[];
  storyId: string | null;
}

export interface AnswerReveal {
  questionId: string;
  selected: number | null;
  correct: boolean;
  correctIndex: number;
  explanation: string;
  extraFact: string | null;
  storyId: string | null;
}

export interface QuizResultItem extends AnswerReveal {
  category: Category;
  type: QuestionType;
  question: string;
  options: string[];
}

export interface QuizResult {
  attemptId: string;
  weekStart: string;
  score: number;
  total: number;
  percentage: number;
  excellence: boolean;
  pointsAwarded: boolean;
  /** true when this week's quiz had already been submitted — the first result is returned. */
  alreadySubmitted?: boolean;
  results: QuizResultItem[];
}

export interface Quiz {
  weekStart: string;
  ageGroup: AgeGroup;
  total: number;
  questions: QuizQuestion[];
  /** The student's result if they already took this week's quiz. */
  attempt: QuizResult | null;
}

export interface Progress {
  studentEmail: string;
  ageGroup: AgeGroup;
  points: number;
  currentStreak: number;
  longestStreak: number;
  digestsCompleted: number;
  storiesRead: number;
  quizzesCompleted: number;
  bestQuizScore: number | null;
  lastQuizScore: number | null;
  badges: { excellence: boolean; weeklyStreak: boolean; growth: boolean };
  lastDigestDate: string | null;
  lastQuizDate: string | null;
  digestCompletedToday: boolean;
}

export interface DigestCompleteResult {
  alreadyCompleted: boolean;
  pointsAwarded: number;
  newBadges: BadgeKey[];
  progress: Progress;
}

export interface StoryReadResult {
  alreadyRead: boolean;
  pointsAwarded: number;
  progress: Progress;
}

export interface QuizCompleteResult {
  alreadyRecorded: boolean;
  pointsAwarded: number;
  newBadges: BadgeKey[];
  percentage: number;
  excellence: boolean;
  growth?: boolean;
  progress: Progress;
}

export interface QuizAnswer {
  questionId: string;
  /** Index of the chosen option. */
  answer: number;
}

const BASE = `${CURRENT_AFFAIRS_SERVER_URL}/current-affairs`;

function query(params: Record<string, string | number | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || `${fallback} (${res.status})`);
  return data as T;
}

async function getJSON<T>(path: string, fallback: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  return parseOrThrow<T>(res, fallback);
}

async function postJSON<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  return parseOrThrow<T>(res, fallback);
}

export function fetchTodayDigest(ageGroup: AgeGroup, studentEmail?: string, date?: string): Promise<Digest> {
  return getJSON<Digest>(`/digest/today${query({ ageGroup, studentEmail, date })}`, "Could not load today's stories");
}

export async function fetchDigestList(limit = 30): Promise<DigestDate[]> {
  const data = await getJSON<{ dates: DigestDate[] }>(`/digest/list${query({ limit })}`, 'Could not load past digests');
  return data.dates;
}

export async function fetchStory(storyId: string, ageGroup: AgeGroup): Promise<Story> {
  const data = await getJSON<{ story: Story }>(`/story/${encodeURIComponent(storyId)}${query({ ageGroup })}`, 'Could not load the story');
  return data.story;
}

export function fetchWeeklyQuiz(ageGroup: AgeGroup, studentEmail?: string): Promise<Quiz> {
  return getJSON<Quiz>(`/quiz/week${query({ ageGroup, studentEmail })}`, "Could not load this week's quiz");
}

/** Reveals one question's answer, explanation and extra fact after the student picks. */
export async function checkQuizAnswer(questionId: string, answer: number): Promise<AnswerReveal> {
  const res = await fetch(`${BASE}/quiz/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, answer }),
  });
  return parseOrThrow<AnswerReveal>(res, 'Could not check the answer');
}

export function submitQuiz(studentEmail: string, ageGroup: AgeGroup, answers: QuizAnswer[], weekStart?: string): Promise<QuizResult> {
  return postJSON<QuizResult>('/quiz/submit', { studentEmail, ageGroup, answers, weekStart }, 'Could not submit the quiz');
}

export async function fetchProgress(studentEmail: string, ageGroup?: AgeGroup): Promise<Progress> {
  const data = await getJSON<{ progress: Progress }>(
    `/progress/${encodeURIComponent(studentEmail)}${query({ ageGroup })}`, 'Could not load your progress');
  return data.progress;
}

export function recordDigestComplete(studentEmail: string, ageGroup: AgeGroup, storyCount?: number): Promise<DigestCompleteResult> {
  return postJSON<DigestCompleteResult>('/progress/digest-complete', { studentEmail, ageGroup, storyCount }, 'Could not save your progress');
}

export function recordStoryRead(studentEmail: string, ageGroup: AgeGroup, storyId: string, durationSeconds?: number): Promise<StoryReadResult> {
  return postJSON<StoryReadResult>('/progress/story-read', { studentEmail, ageGroup, storyId, durationSeconds }, 'Could not save your progress');
}

export function recordQuizComplete(studentEmail: string, ageGroup: AgeGroup, attemptId?: string): Promise<QuizCompleteResult> {
  return postJSON<QuizCompleteResult>('/progress/quiz-complete', { studentEmail, ageGroup, attemptId }, 'Could not save your quiz points');
}
