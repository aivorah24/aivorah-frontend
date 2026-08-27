import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { StudentItem } from '../types';

// The "Assign to: All students / Specific student" picker — shared between
// the AI Assignment flow and step 3 of the Worksheet Upload flow — extracted
// verbatim (no behavior change) from TeacherAssignmentsScreen.tsx, as part of
// splitting the Create Assignment Modal wizard into per-flow components
// (2026-08-25).
export function AssignToPicker({
  assignTo, setAssignTo, selectedStudent, setSelectedStudent, studentSearch, setStudentSearch,
  students, studentsLoaded, teacherCurriculum, grade, setGrade, setCurriculum,
  colors, gold, styles,
}: {
  assignTo: 'all' | 'specific';
  setAssignTo: (v: 'all' | 'specific') => void;
  selectedStudent: StudentItem | null;
  setSelectedStudent: (s: StudentItem | null) => void;
  studentSearch: string;
  setStudentSearch: (v: string) => void;
  students: StudentItem[];
  studentsLoaded: boolean;
  teacherCurriculum: string;
  grade: string;
  setGrade: (g: string) => void;
  setCurriculum: (c: string) => void;
  colors: AppColors;
  gold: string;
  styles: any;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>Assign to</Text>
      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, assignTo === 'all' && { backgroundColor: gold + '18', borderColor: gold }]}
          onPress={() => { setAssignTo('all'); setSelectedStudent(null); }}
          activeOpacity={0.75}
        >
          <Feather name="users" size={13} color={assignTo === 'all' ? gold : colors.textMuted} />
          <Text style={[styles.chipText, assignTo === 'all' && { color: gold }]}>All students</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, assignTo === 'specific' && { backgroundColor: gold + '18', borderColor: gold }]}
          onPress={() => setAssignTo('specific')}
          activeOpacity={0.75}
        >
          <Feather name="user" size={13} color={assignTo === 'specific' ? gold : colors.textMuted} />
          <Text style={[styles.chipText, assignTo === 'specific' && { color: gold }]}>Specific student</Text>
        </TouchableOpacity>
      </View>

      {assignTo === 'specific' && (
        <View style={styles.studentPickerBox}>
          {selectedStudent ? (
            <TouchableOpacity style={styles.selectedStudentChip} onPress={() => setSelectedStudent(null)} activeOpacity={0.7}>
              <Feather name="user" size={13} color={gold} />
              <Text style={styles.selectedStudentName}>{selectedStudent.name}</Text>
              <Text style={styles.selectedStudentGrade}>{selectedStudent.grade}</Text>
              <Feather name="x" size={13} color={colors.textDim} />
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                style={styles.studentSearch}
                placeholder="Search student by name..."
                placeholderTextColor={colors.textDim}
                value={studentSearch}
                onChangeText={setStudentSearch}
              />
              <ScrollView style={styles.studentList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {(() => {
                  const base = students.filter(s => {
                    const matchSearch = s.name?.toLowerCase().includes(studentSearch.toLowerCase());
                    const matchCurriculum = !teacherCurriculum || !s.curriculum || s.curriculum === teacherCurriculum;
                    return matchSearch && matchCurriculum;
                  });
                  // Show ONLY students in the grade currently selected in the
                  // form — picking "Grade 3" must not surface Grade 5 students.
                  const normG = (g?: string) => (g ?? '').toLowerCase().replace(/grade/g, '').replace(/\s+/g, '').trim();
                  const gradeMatched = base.filter(s => !grade || normG(s.grade) === normG(grade));
                  // If the (possibly AI-extracted, e.g. from a worksheet upload) grade
                  // doesn't match any student's grade format, fall back to the full
                  // roster instead of silently showing nothing.
                  const list = gradeMatched.length > 0 ? gradeMatched : base;
                  return list;
                })()
                  .map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.studentRow}
                      onPress={() => {
                        setSelectedStudent(s);
                        setStudentSearch('');
                        // Align the assignment to the chosen student's grade/curriculum
                        if (s.grade) setGrade(s.grade);
                        if (s.curriculum) setCurriculum(s.curriculum);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.studentAvatar}>
                        <Text style={styles.studentAvatarText}>{s.name?.[0] ?? '?'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentRowName}>{s.name}</Text>
                        <Text style={styles.studentRowGrade}>{s.grade}</Text>
                      </View>
                      <Feather name="chevron-right" size={14} color={colors.textDim} />
                    </TouchableOpacity>
                  ))}
                {!studentsLoaded && students.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <ActivityIndicator color={gold} />
                  </View>
                )}
                {studentsLoaded && students.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 }}>
                    <Feather name="users" size={32} color={colors.textDim} style={{ marginBottom: 10 }} />
                    <Text style={{ color: colors.textMain, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 6 }}>No students linked yet</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>Go to the Students tab to add students to your class before creating assignments.</Text>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      )}

      {assignTo === 'all' && (
        <View style={styles.broadcastNote}>
          <Feather name="info" size={13} color={gold} />
          <Text style={styles.broadcastNoteText}>This assignment will be sent to all your students.</Text>
        </View>
      )}
    </>
  );
}
