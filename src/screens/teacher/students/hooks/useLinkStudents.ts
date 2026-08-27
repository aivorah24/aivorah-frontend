import { useState } from 'react';
import { fetchLinkableStudents, linkExistingStudent } from '../services/studentsService';

export function useLinkStudents(user: any, onLinked: () => void) {
  const [linkEmail,      setLinkEmail]      = useState('');
  const [linking,        setLinking]        = useState(false);
  const [linkError,      setLinkError]      = useState('');
  const [linkSearch,     setLinkSearch]     = useState('');
  const [linkGradeFilter, setLinkGradeFilter] = useState<string>('All');
  const [linkableStudents, setLinkableStudents] = useState<any[]>([]);
  const [linkableLoading,  setLinkableLoading]  = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);

  async function loadLinkableStudents(allowedGrades: string[], teacherGrades: string[]) {
    setLinkableLoading(true);
    try {
      // Use the AUTHORITATIVE grades the teacher teaches (allowedGrades = freshly
      // fetched preferences), not the possibly-stale cached user.teaches — otherwise
      // a teacher who teaches Grade 3 + Grade 5 only saw Grade 3 students to link.
      const gradesToUse = allowedGrades.length > 0 ? allowedGrades : teacherGrades;
      const res = await fetchLinkableStudents(user?.email || '', gradesToUse);
      if (res.ok) { const data = await res.json(); setLinkableStudents(data); }
    } catch {}
    setLinkableLoading(false);
  }

  async function handleLinkStudent(closeAddModal: () => void) {
    const emailsToLink = selectedStudents.map(s => s.email).filter(Boolean);
    if (emailsToLink.length === 0 && !linkEmail.trim()) { setLinkError('Please select at least one student.'); return; }
    if (linkEmail.trim()) emailsToLink.push(linkEmail.trim());
    setLinking(true); setLinkError('');
    try {
      for (const email of emailsToLink) {
        const res = await linkExistingStudent(user?.email || '', email);
        const data = await res.json();
        if (!res.ok) { setLinkError(data.error || `Could not link ${email}.`); setLinking(false); return; }
      }
      closeAddModal();
      setLinkEmail('');
      setSelectedStudents([]);
      onLinked();
    } catch (e: any) {
      setLinkError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLinking(false);
    }
  }

  function toggleSelectedStudent(s: any) {
    setSelectedStudents(prev =>
      prev.some(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]
    );
  }

  return {
    linkEmail, setLinkEmail, linking, linkError, setLinkError,
    linkSearch, setLinkSearch, linkGradeFilter, setLinkGradeFilter,
    linkableStudents, linkableLoading, selectedStudents, setSelectedStudents,
    loadLinkableStudents, handleLinkStudent, toggleSelectedStudent,
  };
}
