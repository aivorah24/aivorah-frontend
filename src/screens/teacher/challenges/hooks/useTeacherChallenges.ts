import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Challenge, StudentItem,
  fetchStudentsByTeacher, fetchTeacherPreferences, fetchChallenges, fetchTeacherAssignments,
} from '../services/teacherChallengesService';

export function useTeacherChallenges(teacherEmail: string | undefined, defaultCurriculum: string) {
  const [selectedGrade, setSelectedGrade] = useState('Grade 3');
  const [fetchedGrades, setFetchedGrades] = useState<string[]>([]);
  const [challenges, setChallenges]       = useState<Challenge[]>([]);
  const [loading, setLoading]             = useState(false);
  const [students, setStudents]           = useState<StudentItem[]>([]);
  const [assignedByChallenge, setAssignedByChallenge] = useState<Record<string, string[]>>({});

  useFocusEffect(useCallback(() => {
    if (!teacherEmail) return;
    fetchStudentsByTeacher(teacherEmail).then(data => {
      setStudents(prev => (prev.length === data.length && prev.every((s, i) => s.id === data[i]?.id)) ? prev : data);
    }).catch(() => {});
  }, [teacherEmail]));

  // Fetch the teacher's grades authoritatively from saved preferences — on
  // every focus, so a grade change in Settings is reflected instantly.
  useFocusEffect(useCallback(() => {
    if (!teacherEmail) return;
    fetchTeacherPreferences(teacherEmail)
      .then(p => {
        const g = Array.isArray(p?.teaches)
          ? [...new Set(p.teaches.map((t: any) => t.grade).filter(Boolean))] as string[]
          : [];
        if (g.length > 0) {
          // Only update on real content change - a fresh array is built from
          // `p.teaches` every resolution regardless of whether the grades
          // actually changed, and setting new-array-same-content state on
          // every call re-renders forever if this effect can fire more than
          // once while mounted (real useFocusEffect only fires on nav
          // focus, but re-fetching a value that never changes is still
          // wasted work either way).
          setFetchedGrades(prev => (prev.length === g.length && prev.every((x, i) => x === g[i])) ? prev : g);
          setSelectedGrade(prev => g.includes(prev) ? prev : g[0]);
        }
      })
      .catch(() => {});
  }, [teacherEmail]));

  const loadChallenges = useCallback(() => {
    setLoading(true);
    fetchChallenges(selectedGrade, defaultCurriculum)
      .then(setChallenges)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedGrade, defaultCurriculum]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the challenges fetch, not derivable from render-time values
    loadChallenges();
  }, [loadChallenges]);

  const loadAssignments = useCallback(() => {
    if (!teacherEmail) return;
    fetchTeacherAssignments(teacherEmail).then(list => {
      const map: Record<string, string[]> = {};
      list.forEach(a => { (map[a.challengeId] ??= []).push(a.studentId); });
      setAssignedByChallenge(prev => JSON.stringify(prev) === JSON.stringify(map) ? prev : map);
    });
  }, [teacherEmail]);

  useFocusEffect(loadAssignments);

  return { selectedGrade, setSelectedGrade, fetchedGrades, challenges, loading, students, assignedByChallenge, refreshAssignments: loadAssignments };
}
