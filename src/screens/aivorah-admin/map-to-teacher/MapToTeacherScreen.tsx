import React, { useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { makeStyles } from './styles';
import { useMapToTeacher } from './hooks/useMapToTeacher';

export default function MapToTeacherScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    teachers, visibleStudents, loading, error, load,
    onlyUnassigned, setOnlyUnassigned,
    selectedStudentIds, toggleStudent,
    teacherEmail, setTeacherEmail,
    subjectsText, setSubjectsText, subjects,
    assigning, assignError, assignedCount, assign,
  } = useMapToTeacher();

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Map to Teacher" subtitle="Assign students to a teacher, by subject." onMenuPress={() => navigation?.openDrawer?.()} />

        {loading ? (
          <ActivityIndicator size="large" color={colors.accentYellow} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.emptyBox}>
            <Feather name="alert-circle" size={26} color={colors.textDim} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.toolbar}>
              <TouchableOpacity
                testID="map-filter-unassigned"
                style={[styles.filterChip, onlyUnassigned && styles.filterChipActive]}
                onPress={() => setOnlyUnassigned((v) => !v)}
              >
                <Feather name="filter" size={12} color={colors.textMain} />
                <Text style={styles.filterChipText}>Unassigned only</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: colors.textDim }}>{selectedStudentIds.size} selected</Text>
            </View>

            <View style={styles.table}>
              <Text style={styles.tableHeading}>Students ({visibleStudents.length})</Text>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 0.3 }]} />
                <Text style={styles.tableHeaderCell}>NAME</Text>
                <Text style={styles.tableHeaderCell}>GRADE</Text>
                <Text style={styles.tableHeaderCell}>SCHOOL</Text>
                <Text style={styles.tableHeaderCell}>TEACHERS</Text>
              </View>
              {visibleStudents.length === 0 ? (
                <Text style={styles.emptyRowText}>No students match this filter.</Text>
              ) : (
                visibleStudents.map((s) => {
                  const selected = selectedStudentIds.has(s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      testID={`map-student-row-${s.id}`}
                      style={[styles.tableRow, selected && styles.tableRowSelected]}
                      onPress={() => toggleStudent(s.id)}
                    >
                      <View style={{ flex: 0.3 }}>
                        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                          {selected && <Feather name="check" size={13} color="#0B0B0B" />}
                        </View>
                      </View>
                      <Text style={styles.tableCell}>{s.name}</Text>
                      <Text style={styles.tableCell}>{s.grade}{s.section ? ` · ${s.section}` : ''}</Text>
                      <Text style={styles.tableCell}>{s.school}</Text>
                      <Text style={s.teacher_student.length ? styles.assignedTag : styles.unassignedTag}>
                        {s.teacher_student.length ? s.teacher_student.map((t) => t.teacher?.name || t.subject).join(', ') : 'Unassigned'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <View style={styles.assignCard}>
              <Text style={styles.assignCardTitle}>Assign {selectedStudentIds.size || ''} selected student{selectedStudentIds.size !== 1 ? 's' : ''}</Text>
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>TEACHER EMAIL</Text>
                  <TextInput
                    testID="map-teacher-email"
                    style={styles.input}
                    value={teacherEmail}
                    onChangeText={setTeacherEmail}
                    placeholder={teachers[0]?.email || 'teacher@school.test'}
                    placeholderTextColor={colors.textDim}
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>SUBJECTS (comma-separated)</Text>
                  <TextInput
                    testID="map-subjects"
                    style={styles.input}
                    value={subjectsText}
                    onChangeText={setSubjectsText}
                    placeholder="Maths, Science"
                    placeholderTextColor={colors.textDim}
                  />
                </View>
              </View>
              <Text style={styles.hint}>
                {subjects.length > 1 ? `Creates ${subjects.length} separate assignments per student.` : 'Leave blank for "General".'}
              </Text>

              {!!assignError && (
                <View style={styles.errorBanner} testID="map-assign-error">
                  <Feather name="alert-circle" size={14} color={colors.accentRed} />
                  <Text style={styles.errorText}>{assignError}</Text>
                </View>
              )}
              {!!assignedCount && !assignError && (
                <View style={styles.successBanner} testID="map-assign-success">
                  <Feather name="check-circle" size={14} color={colors.accentCyan} />
                  <Text style={styles.successText}>Assigned {assignedCount} student{assignedCount !== 1 ? 's' : ''}.</Text>
                </View>
              )}

              <TouchableOpacity testID="map-assign-submit" style={styles.submitBtn} onPress={assign} disabled={assigning} activeOpacity={0.85}>
                {assigning ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={styles.submitBtnText}>Assign</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}
