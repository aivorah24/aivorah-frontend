import React from 'react';
import { Feather } from '@expo/vector-icons';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

export interface DayActivity {
  date: string;
  day: string;
  studyMinutes: number;
  xp: number;
  topicsCompleted: number;
}

export interface SubjectStat {
  name: string;
  total: number;
  done: number;
  pct: number;
  color: string;
  icon: FeatherName;
}

export interface Achievement {
  label: string;
  icon: FeatherName;
  color: string;
  unlocked: boolean;
  hint?: string;
}
