import { useCallback, useMemo, useState } from 'react';
import { fetchAdminStudents, fetchAdminTeachers, fetchAdminSchools, assignStudentsToTeacher } from '../services/mapToTeacherService';
import type { AdminSchool, AdminStudent, AdminTeacher } from '../types';

export function useMapToTeacher() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [teacherEmail, setTeacherEmail] = useState('');
  const [subjectsText, setSubjectsText] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignedCount, setAssignedCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, t] = await Promise.all([fetchAdminStudents(), fetchAdminTeachers()]);
      setStudents(s);
      setTeachers(t);
    } catch (e: any) {
      setError(e?.message || 'Could not load students/teachers. Check your connection.');
    } finally {
      setLoading(false);
    }
    // Boards only narrow the Curriculum filter — without them the filters fall back to the student data.
    try {
      setSchools(await fetchAdminSchools());
    } catch {
      setSchools([]);
    }
  }, []);

  const visibleStudents = useMemo(
    () => (onlyUnassigned ? students.filter((s) => s.teacher_student.length === 0) : students),
    [students, onlyUnassigned],
  );

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const subjects = subjectsText.split(',').map((s) => s.trim()).filter(Boolean);

  async function assign() {
    setAssignError('');
    if (!teacherEmail) { setAssignError('Select a teacher.'); return; }
    if (selectedStudentIds.size === 0) { setAssignError('Select at least one student.'); return; }
    const resolvedSubjects = subjects.length > 0 ? subjects : ['General'];

    setAssigning(true);
    try {
      const ids = [...selectedStudentIds];
      // One call per subject — same as the original admin panel, so a
      // student picked for "Maths, Science" gets two distinct assignment
      // rows, not one row with a combined subject string.
      for (const subject of resolvedSubjects) {
        await assignStudentsToTeacher({ studentIds: ids, teacherEmail, subject });
      }
      setAssignedCount(ids.length);
      setSelectedStudentIds(new Set());
      setTeacherEmail('');
      setSubjectsText('');
      await load();
    } catch (e: any) {
      setAssignError(e?.message || 'Failed to assign students. Check your connection.');
    } finally {
      setAssigning(false);
    }
  }

  return {
    students, teachers, schools, visibleStudents, loading, error, load,
    onlyUnassigned, setOnlyUnassigned,
    selectedStudentIds, toggleStudent,
    teacherEmail, setTeacherEmail,
    subjectsText, setSubjectsText, subjects,
    assigning, assignError, assignedCount, assign,
  };
}
