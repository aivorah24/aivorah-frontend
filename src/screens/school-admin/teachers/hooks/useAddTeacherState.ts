import { useCallback, useEffect, useState } from 'react';
import { schoolAdminTeachersService, CreateTeacherResult } from '../services/schoolAdminTeachersService';
import { TeachingEntry, emptyEntry, defaultCurriculumForBase, entriesToTeaches } from '../utils/teachingEntries';

export function useAddTeacherState(email: string | undefined) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [entries, setEntries] = useState<TeachingEntry[]>([emptyEntry()]);
  const [emailOverride, setEmailOverride] = useState('');
  const [schoolCurriculumBase, setSchoolCurriculumBase] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState<CreateTeacherResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!email) return;
      const base = await schoolAdminTeachersService.getSchoolCurriculumBase(email).catch(() => null);
      if (cancelled) return;
      setSchoolCurriculumBase(base);
      const preset = defaultCurriculumForBase(base);
      if (preset) setEntries((prev) => (prev.length === 1 && !prev[0].curriculum ? [{ ...prev[0], curriculum: preset }] : prev));
    })();
    return () => { cancelled = true; };
  }, [email]);

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0;

  const submit = useCallback(async () => {
    if (!email || !canSubmit || submitting) return;
    setSubmitting(true);
    setFormError('');
    try {
      const payload: any = { firstName: firstName.trim(), lastName: lastName.trim(), teaches: entriesToTeaches(entries) };
      if (emailOverride.trim()) payload.email = emailOverride.trim();
      const data = await schoolAdminTeachersService.createTeacher(email, payload);
      setResult(data);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to add teacher');
    } finally {
      setSubmitting(false);
    }
  }, [email, canSubmit, submitting, firstName, lastName, entries, emailOverride]);

  const reset = useCallback(() => {
    setResult(null);
    setFirstName('');
    setLastName('');
    setEmailOverride('');
    setEntries([emptyEntry(defaultCurriculumForBase(schoolCurriculumBase))]);
  }, [schoolCurriculumBase]);

  return {
    firstName, setFirstName, lastName, setLastName, entries, setEntries,
    emailOverride, setEmailOverride, schoolCurriculumBase, openDropdown, setOpenDropdown,
    submitting, formError, result, canSubmit, submit, reset,
  };
}
