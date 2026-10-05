import type React from 'react';
import type { Feather } from '@expo/vector-icons';

export type FeatherName = React.ComponentProps<typeof Feather>['name'];

export type SubjectMeta = {
  icon: FeatherName;
  accentDark: string; // icon/text on dark bg
  accentLight: string; // icon/text on light bg
  bgFromDark: string; bgToDark: string;
  bgFromLight: string; bgToLight: string;
};

export interface TopicItem {
  topic: string;
  unit: string;
  description: string;
  grade?: string;
}

export interface SubjectData {
  subject: string;
  topicCount: number;
  topics: TopicItem[];
  chapterCount?: number; // authoritative chapter count (CBSE); 0 for IB PYP
  unitCount?: number;    // chapters if present, else distinct units from topics
  units?: string[];      // chapter/unit names
  books?: string[];      // textbook names for this subject (e.g. "Poorvi")
  chapters?: { unitNo?: number; title?: string }[]; // CBSE/NCERT chapter list from the server
}

export type CurriculumTopic = {
  grade: string;
  subject: string;
  unit: string;
  topic: string;
};
