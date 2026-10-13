import { useState } from 'react';
import { bulkCreateStudents } from '../services/bulkImportService';
import { useAdminSchools } from '../../shared/useAdminSchools';
import type { BulkCreateResult } from '../types';

export function useBulkImport() {
  const schoolsState = useAdminSchools();
  const [namesText, setNamesText] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BulkCreateResult | null>(null);

  const names = namesText.split('\n').map((s) => s.trim()).filter(Boolean);
  const school = schoolsState.schools.find((sc) => sc.id === schoolId) || null;

  // Curriculum isn't chosen here — the server assigns the school's (by grade).
  async function submit() {
    setError('');
    if (!school) { setError('School is required.'); return; }
    if (!grade.trim()) { setError('Grade is required.'); return; }
    if (names.length === 0) { setError('Enter at least one student name.'); return; }

    setSubmitting(true);
    try {
      const res = await bulkCreateStudents({ students: names, grade: grade.trim(), section: section.trim(), schoolId: school.id, school: school.name });
      setResult(res);
      if (res.created.length > 0) setNamesText('');
    } catch (e: any) {
      setError(e?.message || 'Failed to create student accounts. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setError('');
  }

  return { schoolsState, namesText, setNamesText, names, grade, setGrade, section, setSection, schoolId, setSchoolId, school, submitting, error, result, submit, reset };
}
