import React from 'react';
import { Feather } from '@expo/vector-icons';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

export const SUBJECT_CONFIG: Record<string, { color: string; icon: FeatherName }> = {
  Mathematics:          { color: '#9FB2A4', icon: 'trending-up'  },
  Science:              { color: '#7E9A86', icon: 'zap'          },
  English:              { color: '#C9A24E', icon: 'book-open'    },
  'Social Studies':     { color: '#8A8358', icon: 'globe'        },
  Arts:                 { color: '#C9A24E', icon: 'feather'      },
  'Physical Education': { color: '#9FB2A4', icon: 'activity'     },
  ICT:                  { color: '#BAA467', icon: 'monitor'      },
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
