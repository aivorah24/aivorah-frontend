import { useCallback, useEffect, useState } from 'react';
import { schoolAdminTeachersService } from '../services/schoolAdminTeachersService';
import { TeachingEntry, emptyEntry, entriesToTeaches } from '../utils/teachingEntries';

export interface EditTeacherParam {
  id: string;
  name: string;
  email: string;
  teaches?: { curriculum: string; grade: string; subjects: string[] }[];
}

export function useEditTeacherState(teacher: EditTeacherParam | undefined, adminEmail: string | undefined, onSaved: (teacherName: string) => void) {
  const [entries, setEntries] = useState<TeachingEntry[]>(() => {
    const teaches = teacher?.teaches || [];
    return teaches.length > 0
      ? teaches.map((e) => ({ curriculum: e.curriculum, grade: e.grade, subjectsInput: (e.subjects || []).join(', ') }))
      : [emptyEntry()];
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [schoolCurriculumBase, setSchoolCurriculumBase] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!adminEmail) return;
      const base = await schoolAdminTeachersService.getSchoolCurriculumBase(adminEmail).catch(() => null);
      if (!cancelled) setSchoolCurriculumBase(base);
    })();
    return () => { cancelled = true; };
  }, [adminEmail]);

  const canSubmit = entries.some((e) => e.curriculum && e.grade);

  const save = useCallback(async () => {
    if (!teacher || saving) return;
    setSaving(true);
    setFormError('');
    try {
      await schoolAdminTeachersService.updateTeacherTeaches(teacher.email, entriesToTeaches(entries));
      onSaved(teacher.name);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [teacher, saving, entries, onSaved]);

  return { entries, setEntries, openDropdown, setOpenDropdown, saving, formError, schoolCurriculumBase, canSubmit, save };
}
