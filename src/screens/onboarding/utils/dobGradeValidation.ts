// DOB ↔ Grade consistency check for student onboarding.
// Grade numbering (Grade 1-12) is consistent across CBSE/ICSE/Cambridge/IB PYP/MYP/DP,
// so one curriculum-agnostic table covers all of them (see refactoring discussion).
import { getAge } from '../../auth/utils/validation';

export const GRADE_AGE_RANGES: Record<string, { min: number; max: number }> = {
  'Grade 1': { min: 4, max: 8 },
  'Grade 2': { min: 5, max: 9 },
  'Grade 3': { min: 6, max: 10 },
  'Grade 4': { min: 7, max: 11 },
  'Grade 5': { min: 8, max: 12 },
  'Grade 6': { min: 9, max: 13 },
  'Grade 7': { min: 10, max: 14 },
  'Grade 8': { min: 11, max: 15 },
  'Grade 9': { min: 12, max: 16 },
  'Grade 10': { min: 13, max: 17 },
  'Grade 11': { min: 14, max: 18 },
  'Grade 12': { min: 15, max: 19 },
};

export interface DobGradeCheckResult {
  valid: boolean;
  message?: string;
}

// Only fires when both a parseable DOB and a grade with a known age range are present.
// Missing/invalid DOB and missing grade are left to existing required-field validation.
export function checkDobGradeConsistency(dob: string, grade: string): DobGradeCheckResult {
  const range = GRADE_AGE_RANGES[grade];
  if (!range) return { valid: true };

  const age = getAge(dob);
  if (age === null) return { valid: true };

  if (age < range.min || age > range.max) {
    return {
      valid: false,
      message: `This date of birth doesn't match ${grade} (expected age ${range.min}-${range.max}). Please check the date of birth or grade.`,
    };
  }
  return { valid: true };
}
