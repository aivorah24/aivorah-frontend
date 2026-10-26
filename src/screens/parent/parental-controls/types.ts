export interface Child {
  id: string;
  name: string;
  email: string;
  grade: string;
  curriculum?: string;
  // Raw users-row values (students-service); `grade`/`curriculum` above fall back to defaults when unset.
  profileGrade?: string;
  profileCurriculum?: string;
  studyTimeMinutes: number;
}

export interface Controls {
  // Daily
  isEnabled: boolean;
  dailyLimitMinutes: number;
  lockWhenReached: boolean;
  todayUsageMinutes: number;
  weeklyUsageMinutes: number;
  // Weekly
  weeklyCapEnabled: boolean;
  weeklyCapMinutes: number;
  // Allowed hours
  allowedHoursEnabled: boolean;
  allowedHoursStart: number;
  allowedHoursEnd: number;
  // Break
  breakEnforcerEnabled: boolean;
  breakIntervalMinutes: number;
  breakDurationMinutes: number;
  // Homework first
  homeworkFirstEnabled: boolean;
  // Subject filter
  subjectFilterEnabled: boolean;
  blockedSubjects: string[];
}

export type PickerMode = 'daily' | 'weekly' | 'breakInterval' | 'breakDuration' | 'startHour' | 'endHour' | null;
