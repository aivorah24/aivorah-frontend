import { useState } from 'react';
import { bulkCreateStudents } from '../services/bulkImportService';
import type { BulkCreateResult } from '../types';

export function useBulkImport() {
  const [namesText, setNamesText] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [school, setSchool] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BulkCreateResult | null>(null);

  const names = namesText.split('\n').map((s) => s.trim()).filter(Boolean);

  async function submit() {
    setError('');
    if (!school.trim()) { setError('School name is required.'); return; }
    if (!grade.trim()) { setError('Grade is required.'); return; }
    if (!curriculum.trim()) { setError('Curriculum is required.'); return; }
    if (names.length === 0) { setError('Enter at least one student name.'); return; }

    setSubmitting(true);
    try {
      const res = await bulkCreateStudents({ students: names, grade: grade.trim(), section: section.trim(), school: school.trim(), curriculum: curriculum.trim() });
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

  return { namesText, setNamesText, names, grade, setGrade, section, setSection, school, setSchool, curriculum, setCurriculum, submitting, error, result, submit, reset };
}
