import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { useToast } from '../../../components/common/Toast';
import { useEditTeacherState, EditTeacherParam } from './hooks/useEditTeacherState';
import TeachingEntriesEditor from './components/TeachingEntriesEditor';

export default function SchoolAdminEditTeacherScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const teacher: EditTeacherParam | undefined = route?.params?.teacher;

  function goToTeachers() { navigation?.navigate?.('SchoolAdminTeachers'); }

  const onSaved = (teacherName: string) => {
    showToast({ title: 'Teacher updated', subtitle: `${teacherName}'s subject mapping was saved.`, type: 'success' });
    goToTeachers();
  };

  const { entries, setEntries, openDropdown, setOpenDropdown, saving, formError, schoolCurriculumBase, canSubmit, save } =
    useEditTeacherState(teacher, user?.email, onSaved);

  useEffect(() => {
    if (!teacher) goToTeachers();
  }, [teacher]);

  if (!teacher) return null;

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Edit Teacher"
          subtitle={`${teacher.name} · ${teacher.email}`}
          onMenuPress={() => navigation?.openDrawer?.()}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, openDropdown ? { zIndex: 30 } : null]}>
            <Text style={styles.cardTitle}>Teaching & Access</Text>
            <Text style={styles.cardHint}>Add one entry per grade this teacher handles — each grade can have its own subjects.</Text>
            <TeachingEntriesEditor
              entries={entries} onChange={setEntries}
              schoolCurriculumBase={schoolCurriculumBase} colors={colors}
              openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
            />
          </View>

          {!!formError && (
            <View style={styles.emptyBox}>
              <Feather name="alert-circle" size={22} color={colors.textDim} />
              <Text style={styles.emptyText}>{formError}</Text>
            </View>
          )}

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={goToTeachers} disabled={saving} accessibilityRole="button"><Text style={styles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, (!canSubmit || saving) && styles.primaryBtnDisabled]} onPress={save} disabled={!canSubmit || saving} accessibilityRole="button">
              {saving ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={styles.primaryBtnText}>Save changes</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      {ToastComponent}
    </ScreenLayout>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 720, alignSelf: 'center' },
    card: { backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
    cardTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: colors.textHeading, marginBottom: 4 },
    cardHint: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim, marginBottom: 12, lineHeight: 16 },
    footerRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingHorizontal: 18, height: 42 },
    primaryBtnDisabled: { opacity: 0.45 },
    primaryBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingHorizontal: 16, height: 42 },
    secondaryBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: colors.textHeading },
    emptyBox: { alignItems: 'center', paddingTop: 12, paddingBottom: 12, gap: 10, paddingHorizontal: 24, marginBottom: spacing.md },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  });
}
