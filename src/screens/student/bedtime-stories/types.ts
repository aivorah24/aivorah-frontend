export interface StoryMeta {
  id: string;
  title: string;
  subtitle: string;
  coverColor: string;
  coverIcon: string;
  coverImageUrl: string | null;
  ageGroup: string;
  pageCount: number;
  collection: string;
}

export interface Page {
  pageNumber: number;
  text: string;
  sceneIcon: string;
  sceneColor: string;
  sceneLabel: string;
  imageUrl: string | null;
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  coverColor: string;
  collection: string;
  coverImageUrl?: string | null;
  pages: Page[];
}

export type VoiceOption = 'grandmother' | 'grandfather';

export type AmbientStyle = 'tanpura' | 'flute' | 'tabla' | 'veena';

export interface AmbientProfile {
  root: number;
  style: AmbientStyle;
  bpm?: number;
  intensity?: number;
}
