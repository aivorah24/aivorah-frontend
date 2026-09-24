import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { Challenge, StudentItem } from '../services/teacherChallengesService';
import type { makeStyles } from '../styles';
import { initials } from './LeaderboardComponents';

function getDueDateLabel(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

const normGrade = (g?: string) => (g ?? '').toLowerCase().replace(/grade/g, '').replace(/\s+/g, '').trim();

// Only students in the SAME grade as the challenge may be assigned it — a
// Grade 4 challenge must never be assignable to a Grade 6 student. But a
// roster grade string that doesn't normalize-match the challenge's grade
// format (a stale value, "3rd Grade", "G3", ...) must not make the whole
// roster disappear — that showed "No Grade 3 students linked to your
// account" even when the teacher's real students were fetched correctly,
// making challenge assignment impossible. Same fallback-to-full-roster fix
// already applied to the Assignments flow's equivalent picker
// (AssignToPicker.tsx).
export function filterStudentsForChallenge(students: StudentItem[], challenge: Challenge | null, search: string): StudentItem[] {
  const base = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const gradeMatched = base.filter(s => !challenge?.grade || normGrade(s.grade) === normGrade(challenge.grade));
  return gradeMatched.length > 0 ? gradeMatched : base;
}

export default function AssignChallengeModal({
  visible, challenge, students, studentSearch, setStudentSearch,
  selectedStudent, setSelectedStudent, assigning, assignError, assignSuccess,
  assignDueDate, setAssignDueDate, onClose, onAssign, colors, styles, assignedStudentIds = [],
}: {
  visible: boolean;
  challenge: Challenge | null;
  students: StudentItem[];
  studentSearch: string;
  setStudentSearch: (v: string) => void;
  selectedStudent: StudentItem | null;
  setSelectedStudent: (s: StudentItem | null) => void;
  assigning: boolean;
  assignError: string;
  assignSuccess: string;
  assignDueDate: string;
  setAssignDueDate: (v: string) => void;
  onClose: () => void;
  onAssign: () => void;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
  assignedStudentIds?: string[];
}) {
  const gold = colors.accentYellow;

  const filteredStudents = filterStudentsForChallenge(students, challenge, studentSearch);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Assign Challenge</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>{challenge?.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          {assignSuccess ? (
            <View style={styles.successBox}>
              <Feather name="check-circle" size={16} color={colors.accentGreen} />
              <Text style={[styles.successText, { color: colors.accentGreen }]}>{assignSuccess}</Text>
            </View>
          ) : null}

          {assignError ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={colors.accentRed} />
              <Text style={[styles.errorText, { color: colors.accentRed }]}>{assignError}</Text>
            </View>
          ) : null}

          {!assignSuccess && (
            <>
              <Text style={styles.pickerLabel}>Select Student</Text>

              {selectedStudent ? (
                <TouchableOpacity style={styles.selectedChip} onPress={() => setSelectedStudent(null)} activeOpacity={0.7}>
                  <Feather name="user" size={13} color={gold} />
                  <Text style={styles.selectedChipName}>{selectedStudent.name}</Text>
                  <Text style={styles.selectedChipGrade}>{selectedStudent.grade}</Text>
                  <View style={{ flex: 1 }} />
                  <Feather name="x-circle" size={14} color={colors.textDim} />
                </TouchableOpacity>
              ) : (
                <>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search student by name..."
                    placeholderTextColor={colors.textDim}
                    value={studentSearch}
                    onChangeText={setStudentSearch}
                  />
                  <ScrollView style={styles.studentList} nestedScrollEnabled>
                    {filteredStudents.length === 0 ? (
                      <Text style={styles.noStudents}>
                        {students.length === 0
                          ? 'No students linked to your account.'
                          : studentSearch
                            ? 'No matching students.'
                            : `No ${challenge?.grade || 'matching'} students linked to your account.`}
                      </Text>
                    ) : filteredStudents.map(s => {
                      const already = assignedStudentIds.includes(s.id);
                      return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.studentRow, already && { opacity: 0.5 }]}
                        onPress={() => { setSelectedStudent(s); setStudentSearch(''); }}
                        disabled={already}
                        activeOpacity={0.7}
                      >
                        <View style={styles.studentAvatar}>
                          <Text style={styles.studentAvatarText}>{initials(s.name)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.studentName}>{s.name}</Text>
                          <Text style={styles.studentGrade}>{s.grade}</Text>
                        </View>
                        {already ? (
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.accentGreen }}>Assigned</Text>
                        ) : (
                          <Feather name="chevron-right" size={14} color={colors.textDim} />
                        )}
                      </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMain, marginBottom: 8 }}>
                  <Feather name="flag" size={13} color={gold} /> Due Date
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { label: 'Tomorrow', date: getDueDateLabel(1) },
                    { label: '3 Days',   date: getDueDateLabel(3) },
                    { label: '1 Week',   date: getDueDateLabel(7) },
                    { label: '2 Weeks',  date: getDueDateLabel(14) },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => setAssignDueDate(opt.date)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: assignDueDate === opt.date ? gold : colors.borderColor,
                        backgroundColor: assignDueDate === opt.date ? gold + '18' : 'transparent',
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 12, color: assignDueDate === opt.date ? gold : colors.textMuted }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 6 }}>
                  Due: {assignDueDate || 'Not set'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.assignBtn, (!selectedStudent || assigning) && styles.assignBtnDisabled]}
                onPress={onAssign}
                disabled={!selectedStudent || assigning}
                activeOpacity={0.85}
              >
                {assigning ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={15} color="#fff" />
                    <Text style={styles.assignBtnText}>Assign Challenge</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {assignSuccess && (
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
