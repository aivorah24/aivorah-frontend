import { useState } from 'react';
import { patchProfile } from '../services/settingsService';
import type { TeachingEntry } from '@legacy/school-admin/TeachingEntriesEditor';

// Display Name / School+Institution / Curriculum+Grades — three independent
// PATCH /user/profile calls (each sends only the field(s) it owns), sharing
// one hook because they're all simple "edit one profile field, save,
// optimistically update the local user" flows.
export function useProfileFields(
  email: string | undefined,
  updateUser: (patch: any) => void,
) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function saveName(name: string): Promise<boolean> {
    if (!name.trim()) { setError('Please enter a name.'); return false; }
    setSaving(true);
    setError('');
    const result = await patchProfile({ email: email!, name: name.trim() });
    setSaving(false);
    if (result.error) { setError(result.error); return false; }
    updateUser({ name: name.trim() });
    return true;
  }

  async function saveSchool(school: string): Promise<boolean> {
    setSaving(true);
    setError('');
    const result = await patchProfile({ email: email!, school: school.trim() });
    setSaving(false);
    if (result.error) { setError(result.error); return false; }
    updateUser({ school: school.trim() });
    return true;
  }

  async function saveCurriculum(entries: TeachingEntry[]): Promise<boolean> {
    const validEntries = entries.filter(e => e.curriculum && e.grade);
    if (validEntries.length === 0) { setError('Please add at least one curriculum + grade.'); return false; }
    setSaving(true);
    setError('');
    // Each row is an INDEPENDENT curriculum+grade the teacher actually
    // teaches (e.g. IB MYP/Grade 7 and CBSE/Grade 9) — no cross-product.
    // The users columns hold the first row's values for legacy consumers.
    const teaches = validEntries.map(e => ({
      grade: e.grade, curriculum: e.curriculum,
      subjects: e.subjectsInput.split(',').map(s => s.trim()).filter(Boolean),
    }));
    const primaryCurriculum = teaches[0].curriculum;
    const primaryGrade = teaches[0].grade;
    const result = await patchProfile({ email: email!, curriculum: primaryCurriculum, grade: primaryGrade, teaches });
    setSaving(false);
    if (result.error) { setError(result.error); return false; }
    updateUser({ curriculum: primaryCurriculum, grade: primaryGrade, teaches });
    return true;
  }

  return { saving, error, setError, saveName, saveSchool, saveCurriculum };
}
