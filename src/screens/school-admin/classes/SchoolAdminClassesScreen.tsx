/**
 * School Admin — Classes. Every non-archived Grade×Section pair from Grades
 * & Sections is a class; each can have one assigned Class Teacher, stored
 * on the same academic_structure overlay so it survives grade/section
 * renames (server/routes/school-admin.js: buildGradesSectionsView).
 *
 * Contract:
 *   GET   /school-admin/classes?adminEmail=
 *        -> { classes: [{ grade, section, studentCount, classTeacherEmail, classTeacherName }] }
 *   GET   /school-admin/teachers?adminEmail=          (for the assign picker)
 *   PATCH /school-admin/grades/:grade/sections/:section/class-teacher?adminEmail=
 *        body { teacherEmail: string | null } -> { ok }
 */
import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { useToast } from '../../../components/common/Toast';
import { useClassesState } from './hooks/useClassesState';
import { GradeFilterDropdown } from './components/GradeFilterDropdown';
import { ClassesTable } from './components/ClassesTable';
import { AssignTeacherModal } from './components/AssignTeacherModal';

export default function SchoolAdminClassesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();

  const {
    loading, error, gradeFilter, setGradeFilter, filterOpen, setFilterOpen,
    gradeOptions, visibleClasses,
    pickerFor, pickerSearch, setPickerSearch, pickerBusy, pickerError, pickerTeachers,
    load, openPicker, closePicker, assignTeacher,
    setLoading,
  } = useClassesState(user?.email, showToast);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Classes" subtitle="Every grade–section pair is a class. Assign a class teacher to each." onMenuPress={() => navigation?.openDrawer?.()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <GradeFilterDropdown value={gradeFilter} options={gradeOptions} onChange={setGradeFilter} colors={colors} open={filterOpen} onToggle={() => setFilterOpen((v) => !v)} />
            <Text style={styles.countText}>{visibleClasses.length} class{visibleClasses.length === 1 ? '' : 'es'}</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.emptyBox}>
              <Feather name="alert-circle" size={26} color={colors.textDim} />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
            </View>
          ) : visibleClasses.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="layers" size={26} color={colors.textDim} />
              <Text style={styles.emptyText}>No classes yet. Add grades and sections first in Grades & Sections.</Text>
              <TouchableOpacity onPress={() => navigation?.navigate?.('SchoolAdminGradesSections')} style={styles.retryBtn}><Text style={styles.retryText}>Go to Grades & Sections</Text></TouchableOpacity>
            </View>
          ) : (
            <ClassesTable classes={visibleClasses} colors={colors} onAssign={openPicker} />
          )}
        </ScrollView>
      </View>

      <AssignTeacherModal
        colors={colors}
        pickerFor={pickerFor}
        pickerSearch={pickerSearch}
        onSearchChange={setPickerSearch}
        pickerBusy={pickerBusy}
        pickerError={pickerError}
        pickerTeachers={pickerTeachers}
        onClose={closePicker}
        onAssign={assignTeacher}
      />
      {ToastComponent}
    </ScreenLayout>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 1100, alignSelf: 'center' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, gap: 12 },
    countText: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textDim },
    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 380 },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor },
    retryText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
  });
}
