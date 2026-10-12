import { useState, useCallback, useMemo } from 'react';
import { GradeRow, PromptState } from '../types';
import {
  fetchGradesSections,
  addGrade as addGradeApi,
  addSection as addSectionApi,
  renameGrade as renameGradeApi,
  archiveGrade as archiveGradeApi,
} from '../services/schoolAdminGradesSectionsService';
import { schoolAdminClassesService, type ClassRow, type TeacherOption } from '../../classes/services/schoolAdminClassesService';
import { rankPickerTeachers } from '../../classes/utils/classesSorting';

export function useGradesSections(userEmail: string | undefined | null) {
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [prompt, setPrompt] = useState<PromptState>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptError, setPromptError] = useState('');
  const [promptBusy, setPromptBusy] = useState(false);

  // Right after a brand-new section is added, offer to assign its class
  // teacher immediately — Attendance (and other class-teacher-gated
  // features) silently has nothing to show until someone does this, and it
  // used to be an easy-to-forget separate trip to the Classes screen.
  const [assignFor, setAssignFor] = useState<ClassRow | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  const load = useCallback(async () => {
    if (!userEmail) return;
    setError('');
    try {
      const data = await fetchGradesSections(userEmail);
      setGrades(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load grades & sections. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  function openPrompt(state: PromptState, initial = '') {
    setPrompt(state);
    setPromptValue(initial);
    setPromptError('');
  }

  function closePrompt() {
    setPrompt(null);
    setPromptValue('');
  }

  async function submitPrompt() {
    if (!userEmail || !prompt) return;
    const name = promptValue.trim();
    if (!name) {
      setPromptError('Please enter a name.');
      return;
    }
    setPromptBusy(true);
    setPromptError('');
    try {
      let updated: GradeRow[];
      const wasAddSection = prompt.kind === 'addSection';
      if (prompt.kind === 'addGrade') {
        updated = await addGradeApi(userEmail, name);
      } else if (prompt.kind === 'addSection') {
        updated = await addSectionApi(userEmail, prompt.grade, name);
      } else {
        updated = await renameGradeApi(userEmail, prompt.grade, name);
      }
      setGrades(updated);
      const newGrade = wasAddSection ? (prompt as { kind: 'addSection'; grade: string }).grade : '';
      closePrompt();
      if (wasAddSection) openAssignTeacher(newGrade, name);
    } catch (err: any) {
      setPromptError(err.message || 'Something went wrong. Check your connection.');
    } finally {
      setPromptBusy(false);
    }
  }

  // Minimal ClassRow for a just-created section — 0 students, no teacher yet
  // (AssignTeacherModal/rankPickerTeachers only read grade/section/
  // classTeacherEmail, so this is enough to drive it without a round trip).
  async function openAssignTeacher(grade: string, section: string) {
    setAssignFor({ grade, section, studentCount: 0, classTeacherEmail: null, classTeacherName: null });
    setAssignSearch('');
    setAssignError('');
    // Refetch on every open (teachers added since the first open must show up);
    // keep the previous list on screen meanwhile, and say so if the load fails.
    if (!userEmail) return;
    try {
      setTeachers(await schoolAdminClassesService.getTeachers(userEmail));
    } catch (err: any) {
      setAssignError(err?.message || 'Could not load teachers. Check your connection and try again.');
    }
  }

  function closeAssignTeacher() {
    setAssignFor(null);
  }

  async function assignTeacherNow(teacherEmail: string | null) {
    if (!userEmail || !assignFor) return;
    setAssignBusy(true);
    setAssignError('');
    try {
      await schoolAdminClassesService.assignClassTeacher(assignFor.grade, assignFor.section, userEmail, teacherEmail);
      setAssignFor(null);
    } catch (err: any) {
      setAssignError(err.message || 'Failed to assign class teacher. Check your connection.');
    } finally {
      setAssignBusy(false);
    }
  }

  const assignTeachers = useMemo(() => rankPickerTeachers(teachers, assignFor, assignSearch), [teachers, assignFor, assignSearch]);

  async function toggleArchiveGrade(grade: GradeRow) {
    if (!userEmail) return;
    try {
      const updated = await archiveGradeApi(userEmail, grade.name, !grade.archived);
      if (updated) setGrades(updated);
    } catch {
      // silent — the row just won't change
    }
  }

  return {
    grades,
    loading,
    error,
    showArchived,
    setShowArchived,
    prompt,
    promptValue,
    setPromptValue,
    promptError,
    promptBusy,
    load,
    openPrompt,
    closePrompt,
    submitPrompt,
    toggleArchiveGrade,
    assignFor,
    assignSearch,
    setAssignSearch,
    assignBusy,
    assignError,
    assignTeachers,
    closeAssignTeacher,
    assignTeacherNow,
  };
}
