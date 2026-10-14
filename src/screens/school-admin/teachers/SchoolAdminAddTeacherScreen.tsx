import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { useAddTeacherState } from './hooks/useAddTeacherState';
import TeachingEntriesEditor from './components/TeachingEntriesEditor';

export default function SchoolAdminAddTeacherScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const {
    firstName, setFirstName, lastName, setLastName, entries, setEntries,
    emailOverride, setEmailOverride, schoolCurriculumBase, openDropdown, setOpenDropdown,
    submitting, formError, result, canSubmit, submit, reset,
  } = useAddTeacherState(user?.email);

  function goToTeachers() { navigation?.navigate?.('SchoolAdminTeachers'); }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Add Teacher"
          subtitle="Create a single teacher record. Use Import Teachers for bulk additions."
          onMenuPress={() => navigation?.openDrawer?.()}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {result ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}><Feather name="check" size={20} color="#0B0B0B" /></View>
                <Text style={styles.summaryTitle}>Teacher added</Text>
                <Text style={styles.warnText}>Save these now — the password won&apos;t be shown again.</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Login credentials</Text>
                <View style={styles.credRow}><Text style={styles.credLabel}>Name</Text><Text style={styles.credValue}>{result.name}</Text></View>
                <View style={styles.credRow}><Text style={styles.credLabel}>Login email</Text><Text style={styles.credValue} selectable>{result.email}</Text></View>
                <View style={styles.credRow}><Text style={styles.credLabel}>Password</Text><Text style={styles.credValueMono} selectable>{result.password}</Text></View>
                {result.subjects?.length > 0 && (
                  <View style={styles.credRow}><Text style={styles.credLabel}>Subjects</Text><Text style={styles.credValue}>{result.subjects.join(', ')}</Text></View>
                )}
              </View>
              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={reset} accessibilityRole="button">
                  <Text style={styles.secondaryBtnText}>Add another</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={goToTeachers} accessibilityRole="button"><Text style={styles.primaryBtnText}>Done</Text></TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Basic Information</Text>
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>First name *</Text>
                    <TextInput value={firstName} onChangeText={setFirstName} style={styles.textInput} placeholder="e.g. Priya" placeholderTextColor={colors.textDim} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Last name *</Text>
                    <TextInput value={lastName} onChangeText={setLastName} style={styles.textInput} placeholder="e.g. Sharma" placeholderTextColor={colors.textDim} />
                  </View>
                </View>
              </View>

              <View style={[styles.card, openDropdown ? { zIndex: 30 } : null]}>
                <Text style={styles.cardTitle}>Teaching & Access</Text>
                <Text style={styles.cardHint}>Add one entry per grade this teacher handles — each grade can have its own subjects.</Text>
                <TeachingEntriesEditor
                  entries={entries} onChange={setEntries}
                  schoolCurriculumBase={schoolCurriculumBase} colors={colors}
                  openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
                />
                <Text style={styles.formLabel}>Login email (optional)</Text>
                <TextInput
                  value={emailOverride} onChangeText={setEmailOverride} style={styles.textInput}
                  placeholder="Optional — generated if left blank" placeholderTextColor={colors.textDim}
                  autoCapitalize="none" keyboardType="email-address"
                />
                <Text style={styles.hint}>A secure temporary password is generated automatically and shown once after creation. If a real email is given, the login is emailed to the teacher.</Text>
              </View>

              {!!formError && (
                <View style={styles.emptyBox}>
                  <Feather name="alert-circle" size={22} color={colors.textDim} />
                  <Text style={styles.emptyText}>{formError}</Text>
                </View>
              )}

              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={goToTeachers} disabled={submitting} accessibilityRole="button"><Text style={styles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, (!canSubmit || submitting) && styles.primaryBtnDisabled]} onPress={submit} disabled={!canSubmit || submitting} accessibilityRole="button">
                  {submitting ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={styles.primaryBtnText}>Create Teacher</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
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
    formRow: { flexDirection: 'row', gap: 14 },
    formLabel: { fontFamily: fonts.serif, fontSize: 11.5, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 10 },
    textInput: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bgDark },
    hint: { fontFamily: fonts.serif, fontSize: 11, color: colors.textDim, marginTop: 10, lineHeight: 16 },
    footerRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingHorizontal: 18, height: 42 },
    primaryBtnDisabled: { opacity: 0.45 },
    primaryBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingHorizontal: 16, height: 42 },
    secondaryBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: colors.textHeading },
    emptyBox: { alignItems: 'center', paddingTop: 12, paddingBottom: 12, gap: 10, paddingHorizontal: 24, marginBottom: spacing.md },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
    summaryCard: { backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
    summaryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    summaryTitle: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '700', color: colors.textHeading, marginBottom: 6 },
    warnText: { fontFamily: fonts.serif, fontSize: 12, color: colors.accentYellow, textAlign: 'center' },
    credRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    credLabel: { fontFamily: fonts.serif, fontSize: 12, color: colors.textDim },
    credValue: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.textHeading, flexShrink: 1, textAlign: 'right' },
    credValueMono: { fontFamily: Platform.select({ web: 'monospace', default: fonts.serif }), fontSize: 12, fontWeight: '700', color: colors.textHeading },
  });
}
