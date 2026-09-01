import React from 'react';
import { Feather } from '@expo/vector-icons';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

// All subjects share one accent color so the grid reads as a uniform set —
// only the icon varies per subject. Previously each subject had its own
// color and subjects outside this map fell back to a different default,
// making English (and Arts) look randomly highlighted next to the rest.
export const SUBJECT_ACCENT_COLOR = '#C9A24E';

export const SUBJECT_CONFIG: Record<string, { color: string; icon: FeatherName }> = {
  Mathematics:          { color: SUBJECT_ACCENT_COLOR, icon: 'trending-up'  },
  Science:              { color: SUBJECT_ACCENT_COLOR, icon: 'zap'          },
  English:              { color: SUBJECT_ACCENT_COLOR, icon: 'book-open'    },
  'Social Studies':     { color: SUBJECT_ACCENT_COLOR, icon: 'globe'        },
  Arts:                 { color: SUBJECT_ACCENT_COLOR, icon: 'feather'      },
  'Physical Education': { color: SUBJECT_ACCENT_COLOR, icon: 'activity'     },
  ICT:                  { color: SUBJECT_ACCENT_COLOR, icon: 'monitor'      },
};

// Achievement rule definitions — thresholds evaluated live against real stats
// in utils/progressCalculations.ts's computeAchievements.
export const ACHIEVEMENT_DEFS: { key: string; label: (streak: number) => string; icon: FeatherName; color: string }[] = [
  { key: 'streak',     label: (streak) => `${streak}-Day Streak`, icon: 'zap',         color: '#8A8358' },
  { key: 'firstTopic', label: () => 'First Topic',                icon: 'book-open',   color: '#9FB2A4' },
  { key: 'topics5',    label: () => '5 Topics Done',               icon: 'award',       color: '#BAA467' },
  { key: 'topics10',   label: () => '10 Topics Done',              icon: 'star',        color: '#7E9A86' },
  { key: 'xp500',      label: () => '500 XP',                      icon: 'trending-up', color: '#8A8358' },
  { key: 'hour1',      label: () => '1 Hour Studied',              icon: 'clock',       color: '#9FB2A4' },
  { key: 'level2',     label: () => 'Level 2+',                    icon: 'shield',      color: '#C9A24E' },
  { key: 'challenge1', label: () => 'Challenge Done',               icon: 'target',      color: '#C9A24E' },
];
