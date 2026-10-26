import { useMemo } from 'react';
import { useSubjects } from '../../../student/learning-paths/hooks/useSubjects';
import { curriculumFlags } from '../../../student/learning-paths/utils';
import { NO_CONTENT_GRADES } from '../../../student/learning-paths/constants';
import type { Child } from '../types';

// The child's subjects from the same source as their "My Learning Journey" screen, so a blocked name is
// exactly that screen's card key. Teacher-published subjects aren't included (they need the child's own auth).
export function useChildSubjects(child: Child | null) {
  const curriculum = (child?.profileCurriculum ?? child?.curriculum ?? '').trim();
  const grade = (child?.profileGrade ?? child?.grade ?? '').trim();
  const { isCBSE, isPYP, label } = curriculumFlags(curriculum);
  const noContent = NO_CONTENT_GRADES.includes(grade);
  const { subjects, loading, error } = useSubjects(noContent ? '' : curriculum, noContent ? '' : grade, isCBSE, isPYP);
  const names = useMemo(() => subjects.map(s => s.subject), [subjects]);

  const name = child?.name || 'This child';
  let notice: string | null = null;
  if (!curriculum || !grade) notice = `${name}'s curriculum or grade isn't set yet. Update their profile to choose subjects.`;
  else if (noContent) notice = `Subjects for ${grade} aren't available yet.`;
  else if (error) notice = error;
  else if (!loading && names.length === 0) notice = `No subjects available for ${label} ${grade} yet.`;

  return { subjects: names, loading: loading && !notice, notice };
}
