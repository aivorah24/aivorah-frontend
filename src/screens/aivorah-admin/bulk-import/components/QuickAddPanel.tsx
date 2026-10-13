import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { getGradesForCurriculum } from '../../../school-admin/teachers/utils/teachingEntries';
import { curriculaForBoard, compareGrades, describeBoard } from '../../shared/academicLabels';
import { SelectField } from '../../shared/SelectField';
import { useBulkImport } from '../hooks/useBulkImport';

const ALL_CURRICULA = ['IB PYP', 'IB MYP', 'IB DP', 'CBSE', 'ICSE', 'Cambridge'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const NO_SECTION = 'all';

// Grades across every curriculum the school's board covers (IB → 1-12 via PYP/MYP/DP).
const gradesForBoard = (board: string | null | undefined) =>
  [...new Set((curriculaForBoard(board) ?? ALL_CURRICULA).flatMap(getGradesForCurriculum))]
    .filter((g) => /^Grade \d+$/.test(g)).sort(compareGrades);

export function QuickAddPanel() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const {
    namesText, setNamesText, names, grade, setGrade, section, setSection,
    schoolsState, schoolId, setSchoolId, school, submitting, error, result, submit, reset,
  } = useBulkImport();

  const gradeOptions = school ? gradesForBoard(school.curriculum) : [];
  const boardLabel = describeBoard(school?.curriculum);

  function pickSchool(id: string) {
    setSchoolId(id);
    const next = schoolsState.schools.find((sc) => sc.id === id);
    if (grade && !gradesForBoard(next?.curriculum).includes(grade)) setGrade('');
  }

  if (result) {
    return (
      <View style={s.card}>
        <View style={s.headRow}>
          <Feather name="check-circle" size={16} color={colors.accentGreen} />
          <Text style={s.title}>
            {result.created.length} account{result.created.length !== 1 ? 's' : ''} created{result.errors.length ? `, ${result.errors.length} failed` : ''}
          </Text>
        </View>
        <Text style={s.hint}>Save these — passwords are shown only once.</Text>
        <View style={s.tableBox}>
          <View style={[s.tr, s.thRow]}>
            {['Name', 'Login email', 'Password', 'Grade'].map((h) => <Text key={h} style={s.th}>{h}</Text>)}
          </View>
          {result.created.map((c) => (
            <View key={c.email} style={s.tr} testID={`bulk-created-row-${c.email}`}>
              <Text style={s.td} numberOfLines={1}>{c.name}</Text>
              <Text style={s.td} numberOfLines={1}>{c.email}</Text>
              <Text style={[s.td, s.mono]}>{c.password}</Text>
              <Text style={s.td}>{c.grade}{c.section ? ` · ${c.section}` : ''}</Text>
            </View>
          ))}
          {result.errors.map((e, i) => (
            <View key={`${e.name}-${i}`} style={[s.tr, s.trBad]} testID={`bulk-error-row-${i}`}>
              <Text style={s.td}>{e.name}</Text>
              <Text style={[s.td, { color: colors.accentRed, flex: 3 }]}>{e.error}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[s.btnGhost, { marginTop: 14 }]} onPress={reset} testID="bulk-import-again">
          <Feather name="refresh-ccw" size={13} color={colors.accentYellow} />
          <Text style={s.btnGhostText}>Add more</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.columns}>
        <View style={s.colDetails}>
          <Text style={s.title}>Class details</Text>
          <Text style={s.hint}>Applied to every student in this batch.</Text>
          <View style={s.fields}>
            <SelectField testID="bulk-school" label="School" placeholder={schoolsState.placeholder} value={schoolId}
              options={schoolsState.schools.map((sc) => ({ value: sc.id, label: sc.name }))} onChange={pickSchool} minWidth={0} />
            {!!school && (
              <Text style={s.curriculumNote} testID="bulk-curriculum-note">
                {boardLabel
                  ? `Curriculum: ${boardLabel} (from ${school.name})`
                  : `${school.name} has no curriculum set — students will be enrolled without one`}
              </Text>
            )}
            <SelectField testID="bulk-grade" label="Grade" placeholder={school ? 'Select' : 'Pick school'} value={grade}
              options={gradeOptions} onChange={setGrade} minWidth={0} />
            <SelectField testID="bulk-section" label="Section (optional)" allLabel="No section" value={section || NO_SECTION}
              options={SECTIONS} onChange={(v) => setSection(v === NO_SECTION ? '' : v)} minWidth={0} />
          </View>
          {!!schoolsState.error && (
            <TouchableOpacity onPress={schoolsState.reload}><Text style={s.errorText}>{schoolsState.error} Tap to retry.</Text></TouchableOpacity>
          )}
        </View>

        <View style={s.colNames}>
          <View style={s.headRow}>
            <Text style={s.title}>Student names</Text>
            <Text style={s.countBadge}>{names.length}</Text>
          </View>
          <Text style={s.hint}>One name per line — a login email and one-time password are generated for each.</Text>
          <TextInput
            testID="bulk-names"
            style={s.textarea}
            value={namesText}
            onChangeText={setNamesText}
            placeholder={'Asha Rao\nBen Kumar\nCara Iyer'}
            placeholderTextColor={colors.textDim}
            multiline
          />
        </View>
      </View>

      <View style={s.footer}>
        {!!error && (
          <View style={s.errorBanner} testID="bulk-import-error">
            <Feather name="alert-circle" size={14} color={colors.accentRed} />
            <Text style={s.errorBannerText}>{error}</Text>
          </View>
        )}
        <TouchableOpacity testID="bulk-import-submit" style={[s.submitBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#0B0B0B" size="small" /> : (
            <>
              <Feather name="user-plus" size={14} color="#0B0B0B" />
              <Text style={s.submitText}>Create {names.length || ''} account{names.length !== 1 ? 's' : ''}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    card: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.md, padding: 20 },
    columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
    colDetails: { flexGrow: 1, flexBasis: 300, minWidth: 260 },
    colNames: { flexGrow: 1.4, flexBasis: 360, minWidth: 280 },
    fields: { gap: 12, marginTop: 12 },
    curriculumNote: { fontSize: 12.5, fontWeight: '600', color: c.textMain },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800', color: c.textHeading },
    countBadge: {
      fontSize: 11.5, fontWeight: '800', color: c.accentYellow, backgroundColor: c.accentYellow + '1A',
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, overflow: 'hidden',
    },
    hint: { fontSize: 11.5, color: c.textDim, marginTop: 3 },
    textarea: {
      marginTop: 12, minHeight: 196, fontSize: 13.5, color: c.textMain, textAlignVertical: 'top',
      borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.cardDark,
    },
    footer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap',
      marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.borderColor,
    },
    errorBanner: {
      flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 9, borderRadius: radius.sm,
      backgroundColor: c.accentRed + '12', borderWidth: 1, borderColor: c.accentRed + '30',
    },
    errorBannerText: { fontSize: 12.5, color: c.accentRed, flex: 1 },
    errorText: { fontSize: 12.5, color: c.accentRed, marginTop: 8 },
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.accentYellow,
      borderRadius: radius.sm, paddingHorizontal: 18, paddingVertical: 10,
    },
    submitText: { fontSize: 13.5, fontWeight: '700', color: '#0B0B0B' },
    tableBox: { borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.sm, overflow: 'hidden', marginTop: 12 },
    tr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.borderColor },
    thRow: { backgroundColor: c.textHeading + '12' },
    trBad: { backgroundColor: c.accentRed + '0D' },
    th: { flex: 1, fontSize: 11.5, fontWeight: '800', color: c.textMain },
    td: { flex: 1, fontSize: 12.5, color: c.textMain },
    mono: { fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined },
    btnGhost: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor },
    btnGhostText: { fontSize: 12.5, fontWeight: '700', color: c.accentYellow },
  });
}
