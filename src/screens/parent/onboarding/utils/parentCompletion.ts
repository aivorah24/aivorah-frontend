// Per-card completion logic for OnboardingParentBoxes — moved out so it can
// be unit-tested directly. Same logic, same thresholds, no behavior change.

export interface ChildEntry {
  name: string;
  age: string;
  grade: string;
  curriculum: string;
  school: string;
  schoolCity: string;
  email: string;
  linkEmail: string;
  password: string;
  verifiedEmail: string;
}

export interface ParentCompletionInput {
  fullName: string;
  city: string;
  dob: string;
  mobile: string;
  children: ChildEntry[];
  avatarStyle: string;
}

export interface ParentCompletionResult {
  personalDone: boolean;
  addingChildren: boolean;
  startedChildren: ChildEntry[];
  curriculumDone: boolean;
  accountDone: boolean;
  avatarDone: boolean;
  requiredDone: boolean;
  completionPct: number;
}

function isChildAccountDone(c: ChildEntry): boolean {
  const age = c.age ? parseInt(c.age, 10) : 0;
  if (age >= 14) return /^\S+@\S+\.\S+$/.test(c.linkEmail.trim());
  if (c.school.trim().length < 2) return false;
  if (c.password.length !== 0 && c.password.length < 6) return false;
  const email = c.email.trim().toLowerCase();
  if (email.length > 0) {
    if (!/^\S+@\S+\.\S+$/.test(email)) return false;
    if (c.verifiedEmail.trim().toLowerCase() !== email) return false;
  }
  return true;
}

function isChildSchoolOrLinkDone(c: ChildEntry): boolean {
  const age = c.age ? parseInt(c.age, 10) : 0;
  if (age >= 14) return /^\S+@\S+\.\S+$/.test(c.linkEmail.trim());
  return c.school.trim().length >= 2;
}

export function computeParentCompletion({
  fullName, city, dob, mobile, children, avatarStyle,
}: ParentCompletionInput): ParentCompletionResult {
  const personalDone = fullName.trim().length >= 2 && city.trim().length >= 2
    && dob.trim().length > 0 && mobile.trim().length > 0;

  // Adding children is OPTIONAL — a child only has to be completed if the
  // parent actually started adding one (entered a name).
  const startedChildren = children.filter(c => c.name.trim().length >= 2);
  const addingChildren = startedChildren.length > 0;
  const curriculumDone = startedChildren.every(c => c.curriculum.length > 0 && c.grade.length > 0);
  const accountDone = startedChildren.every(isChildAccountDone);
  const avatarDone = avatarStyle.length > 0;

  const requiredDone = personalDone && curriculumDone && accountDone;

  const childCurriculumDone = startedChildren.every(c => c.curriculum.length > 0);
  const childGradeDone = startedChildren.every(c => c.grade.length > 0);
  const childSchoolOrLinkDone = startedChildren.every(isChildSchoolOrLinkDone);
  const completionSteps = [
    fullName.trim().length >= 2,
    city.trim().length >= 2,
    dob.trim().length > 0,
    mobile.trim().length > 0,
    ...(addingChildren ? [childCurriculumDone, childGradeDone, childSchoolOrLinkDone, accountDone] : []),
  ];
  const completionPct = Math.round((completionSteps.filter(Boolean).length / completionSteps.length) * 100);

  return { personalDone, addingChildren, startedChildren, curriculumDone, accountDone, avatarDone, requiredDone, completionPct };
}
