import type { ChildData } from './types';

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEK_DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const EMPTY_CHILD: ChildData = {
  id: '', name: '', grade: '', status: 'needs_attention',
  xpPoints: 0, completedTopics: [], currentStreak: 0,
  studyTimeMinutes: 0, assignmentsDone: 0, challengesCompleted: 0,
};
