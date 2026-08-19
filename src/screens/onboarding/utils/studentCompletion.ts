// Per-card completion logic for OnboardingStudentBoxes — moved out so it can
// be unit-tested directly. Same logic, same thresholds, no behavior change.

import { getAge } from '../../auth/utils/validation';

export interface StudentCompletionInput {
  fullName: string;
  dob: string;
  curriculum: string;
  school: string;
  grade: string;
  avatarStyle: string;
  learningStyle: string;
}

export interface StudentCompletionResult {
  aboutYouDone: boolean;
  curriculumDone: boolean;
  schoolGradeDone: boolean;
  avatarDone: boolean;
  learningStyleDone: boolean;
  requiredDone: boolean;
  completionPct: number;
}

export function computeStudentCompletion({
  fullName,
  dob,
  curriculum,
  school,
  grade,
  avatarStyle,
  learningStyle,
}: StudentCompletionInput): StudentCompletionResult {
  const aboutYouDone = fullName.trim().length >= 2 && getAge(dob) !== null && getAge(dob)! >= 14;
  const curriculumDone = curriculum.length > 0;
  const schoolGradeDone = school.trim().length >= 2 && grade.length > 0;
  const avatarDone = avatarStyle.length > 0;
  const learningStyleDone = learningStyle.length > 0;

  const requiredDone = aboutYouDone && curriculumDone && schoolGradeDone;
  const doneCount = [aboutYouDone, curriculumDone, schoolGradeDone, avatarDone, learningStyleDone].filter(Boolean).length;
  const completionPct = Math.round((doneCount / 5) * 100);

  return { aboutYouDone, curriculumDone, schoolGradeDone, avatarDone, learningStyleDone, requiredDone, completionPct };
}
