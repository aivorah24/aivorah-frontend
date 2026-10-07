/**
 * School Admin — Grades & Sections (managed view over academic structure).
 *
 * Student data (users.grade / users.section) is the source of truth for what
 * grades/sections exist and their live counts; a thin overlay on the school
 * (schools.academic_structure) persists structure students don't imply yet
 * (empty sections, freshly added grades, archive flags). The two are merged
 * server-side — this screen just renders and mutates that merged view.
 *
 * Contract: see services/schoolAdminGradesSectionsService.ts.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { useGradesSections } from './hooks/useGradesSections';
import GradeRow from './components/GradeRow';
import GradesSectionsPromptModal from './components/GradesSectionsPromptModal';
import { AssignTeacherModal } from '../classes/components/AssignTeacherModal';

export default function SchoolAdminGradesSectionsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();

  const {
    grades, loading, error, showArchived, setShowArchived,
    prompt, promptValue, setPromptValue, promptError, promptBusy,
    load, openPrompt, closePrompt, submitPrompt, toggleArchiveGrade,
    assignFor, assignSearch, setAssignSearch, assignBusy, assignError, assignTeachers,
    closeAssignTeacher, assignTeacherNow,
  } = useGradesSections(user?.email);

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const visibleGrades = useMemo(() => grades.filter((g) => showArchived || !g.archived), [grades, showArchived]);
  const archivedCount = useMemo(() => grades.filter((g) => g.archived).length, [grades]);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Grades & Sections"
          subtitle="Configure your school's academic structure. Grades and sections are fully configurable."
          onMenuPress={() => navigation?.openDrawer?.()}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            {archivedCount > 0 ? (
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowArchived((v) => !v)} accessibilityRole="button">
                <Feather name={showArchived ? 'eye-off' : 'archive'} size={13} color={colors.textMuted} />
                <Text style={styles.ghostBtnText}>{showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}</Text>
              </TouchableOpacity>
            ) : <View />}
            <TouchableOpacity style={styles.addBtn} onPress={() => openPrompt({ kind: 'addGrade' })} accessibilityRole="button">
              <Feather name="plus" size={15} color="#0B0B0B" />
              <Text style={styles.addBtnText}>Add Grade</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.emptyBox}>
              <Feather name="alert-circle" size={26} color={colors.textDim} />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity onPress={() => load()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
            </View>
          ) : visibleGrades.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="layers" size={26} color={colors.textDim} />
              <Text style={styles.emptyText}>No grades yet. Add your first grade to define your school&apos;s structure.</Text>
            </View>
          ) : (
            <View style={styles.table}>
              {visibleGrades.map((grade, gi) => (
                <GradeRow
                  key={grade.name}
                  grade={grade}
                  isLast={gi === visibleGrades.length - 1}
                  colors={colors}
                  onRename={() => openPrompt({ kind: 'renameGrade', grade: grade.name }, grade.name)}
                  onAddSection={() => openPrompt({ kind: 'addSection', grade: grade.name })}
                  onToggleArchive={() => toggleArchiveGrade(grade)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <GradesSectionsPromptModal
        prompt={prompt}
        value={promptValue}
        onChangeValue={setPromptValue}
        error={promptError}
        busy={promptBusy}
        colors={colors}
        onClose={closePrompt}
        onSubmit={submitPrompt}
      />

      <AssignTeacherModal
        colors={colors}
        pickerFor={assignFor}
        pickerSearch={assignSearch}
        onSearchChange={setAssignSearch}
        pickerBusy={assignBusy}
        pickerError={assignError}
        pickerTeachers={assignTeachers}
        onClose={closeAssignTeacher}
        onAssign={assignTeacherNow}
      />
    </ScreenLayout>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 1100, alignSelf: 'center' },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, gap: 12, flexWrap: 'wrap' },
    ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: radius.sm },
    ghostBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingHorizontal: 16, height: 40, marginLeft: 'auto',
    },
    addBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },

    table: { backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, overflow: 'hidden' },

    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 360 },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor },
    retryText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
  });
}
