import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { StudentItem } from '../types';
import { fetchStudentsByTeacher } from '../services/scheduleService';

export function useStudents(userEmail?: string) {
  const [students, setStudents] = useState<StudentItem[]>([]);

  // Re-fetch students on every focus so removing a student is reflected immediately
  useFocusEffect(useCallback(() => {
    if (!userEmail) return;
    fetchStudentsByTeacher(userEmail).then(setStudents);
  }, [userEmail]));

  return { students, setStudents };
}
