// Per-card completion logic for OnboardingTeacherBoxes — moved out so it can
// be unit-tested directly. Same logic, same thresholds, no behavior change.

export interface TeachingEntry {
  curriculum: string;
  grade: string;
  subjectsInput: string;
}

export interface CompleteTeachingEntry {
  curriculum: string;
  grade: string;
  subjects: string[];
}

export interface TeacherCompletionInput {
  fullName: string;
  dob: string;
  mobile: string;
  school: string;
  city: string;
  state: string;
  country: string;
  teacherRole: string;
  entries: TeachingEntry[];
  avatarStyle: string;
}

export interface TeacherCompletionResult {
  personalDone: boolean;
  schoolDone: boolean;
  professionalDone: boolean;
  teachingDone: boolean;
  avatarDone: boolean;
  requiredDone: boolean;
  completionPct: number;
  teachesFromEntries: CompleteTeachingEntry[];
  completeEntries: CompleteTeachingEntry[];
  primaryCurriculum: string;
  primaryGrade: string;
}

export function computeTeacherCompletion({
  fullName, dob, mobile, school, city, state, country, teacherRole, entries, avatarStyle,
}: TeacherCompletionInput): TeacherCompletionResult {
  const personalDone = fullName.trim().length >= 2 && dob.trim().length >= 6 && mobile.trim().length >= 7;
  const schoolDone = school.trim().length >= 2 && city.trim().length >= 2 && state.trim().length >= 2 && country.trim().length >= 2;
  const professionalDone = teacherRole.length > 0;

  const teachesFromEntries = entries
    .filter(e => e.curriculum && e.grade)
    .map(e => ({
      curriculum: e.curriculum.trim(),
      grade: e.grade.trim(),
      subjects: e.subjectsInput.split(',').map(s => s.trim()).filter(Boolean),
    }));
  const completeEntries = teachesFromEntries.filter(t => t.subjects.length > 0);
  const primaryCurriculum = completeEntries[0]?.curriculum || entries.find(e => e.curriculum)?.curriculum?.trim() || '';
  const primaryGrade = completeEntries[0]?.grade || '';

  const teachingDone = completeEntries.length > 0;
  const avatarDone = avatarStyle.length > 0;

  const requiredDone = personalDone && schoolDone && professionalDone && teachingDone;
  const doneCount = [personalDone, schoolDone, professionalDone, teachingDone, avatarDone].filter(Boolean).length;
  const completionPct = Math.round((doneCount / 5) * 100);

  return {
    personalDone, schoolDone, professionalDone, teachingDone, avatarDone, requiredDone, completionPct,
    teachesFromEntries, completeEntries, primaryCurriculum, primaryGrade,
  };
}
