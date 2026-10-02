export type SessionPhase = 'idle' | 'countdown' | 'reading' | 'preview' | 'analysing' | 'reviewing';
export type WordStatus = 'pending' | 'current' | 'correct' | 'misread' | 'skipped';
export type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
export type PassageLevel = 'easy' | 'medium' | 'hard';
export type RecognitionEngine = 'vosk' | 'webspeech' | 'whisper';
export type LiveSpeechStatus = 'idle' | 'listening' | 'unavailable' | 'error';
export type VoskStatus = 'loading' | 'ready' | 'unavailable';

export interface PassageSummary {
  title: string;
  topic: string;
  level: string;
  wordCount: number;
  icon?: string;
  gradient?: [string, string];
}

export interface Passage extends PassageSummary {
  text: string;
}

export interface ReadingError {
  word: string;
  position: number;
  type: string;
}

export interface AssessResult {
  accuracy: number;
  wcpm: number;
  wpm: number;
  totalWords: number;
  correct: number;
  misread: number;
  skipped: number;
  duration: number;
  errors: ReadingError[];
  feedback: string;
  level: string;
  starsEarned?: number;
  lexile?: number | null;
  lexileChange?: number;
  isCalibration?: boolean;
  calibrationLexile?: number;
}

export interface LexileInfo {
  lexile: number | null;
  needsCalibration: boolean;
}

export interface WordTiming {
  startTime: number;
  endTime: number;
}

export interface SpeechAudio {
  audioUrl?: string | null;
  wordTimings?: WordTiming[] | null;
}

export interface TranscribeResult {
  transcript?: string;
  wordStatuses?: string[];
  matchedUpTo?: number;
  totalWords?: number;
}
