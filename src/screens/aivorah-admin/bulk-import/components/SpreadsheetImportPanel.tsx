import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { STUDENT_IMPORT_FIELDS, csvEscape, downloadCsv, downloadXlsxTemplate } from '../../../../utils/spreadsheet';
import { describeBoard } from '../../shared/academicLabels';
import { SelectField } from '../../shared/SelectField';
import { TablePager, usePaged } from '../../shared/TablePager';
import { useSpreadsheetImport } from '../hooks/useSpreadsheetImport';
import { SchoolCurriculumPicker } from './SchoolCurriculumPicker';

// Curriculum comes from the school, so it's never a column.
const IMPORT_FIELDS = STUDENT_IMPORT_FIELDS.filter((f) => f.value !== 'curriculum');
const EXAMPLE: Record<string, string> = {
  studentName: 'Asha Rao', studentEmail: 'asha.rao@example.com', grade: 'Grade 4', section: 'A',
  parentName: 'Mona Rao', parentEmail: 'mona.rao@example.com', parentPhone: '9876543210',
};
const fieldsFor = (withParents: boolean) => IMPORT_FIELDS.filter((f) => withParents || !f.value.startsWith('parent'));
const NOT_IMPORTED = '__none__';

// Review table columns — header and body cells share these so they stay aligned.
const COL = StyleSheet.create({
  row: { flexGrow: 0, flexShrink: 0, flexBasis: 44, width: 44, minWidth: 44 },
  student: { flex: 1.4 },
  grade: { flex: 1 },
  curriculum: { flex: 1 },
  parent: { flex: 1 },
  check: { flex: 1.6 },
});

function loginsTitle(creds: { role: string }[]) {
  const parents = creds.filter((c) => c.role === 'parent').length;
  const students = creds.length - parents;
  const part = (n: number, w: string) => `${n} ${w}${n !== 1 ? 's' : ''}`;
  return parents ? `Logins — ${part(students, 'student')} + ${part(parents, 'parent')}` : `Logins — ${part(students, 'student')}`;
}

const CRED = StyleSheet.create({
  name: { flexGrow: 1.2, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  role: { flexGrow: 0, flexShrink: 0, flexBasis: 84, width: 84 },
  email: { flexGrow: 1.8, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  password: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
});
const CRED_COLS = [['Name', CRED.name], ['Role', CRED.role], ['Login email', CRED.email], ['Password', CRED.password]] as const;

export function pickFile(onLoad: (name: string, content: ArrayBuffer | string) => void) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const isExcel = /\.xlsx?$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = () => onLoad(file.name, isExcel ? (reader.result as ArrayBuffer) : String(reader.result || ''));
    if (isExcel) reader.readAsArrayBuffer(file); else reader.readAsText(file);
  };
  input.click();
}

export function Step({ n, title, done, s, children, right }: { n: number; title: string; done?: boolean; s: any; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={s.card}>
      <View style={s.stepHeader}>
        <View style={[s.stepNum, done && s.stepNumDone]}>
          {done ? <Feather name="check" size={13} color="#FFFFFF" /> : <Text style={s.stepNumText}>{n}</Text>}
        </View>
        <Text style={s.stepTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function SpreadsheetImportPanel({ includeParents = true }: { includeParents?: boolean }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const imp = useSpreadsheetImport();
  const { setIncludeParents } = imp;
  useEffect(() => { setIncludeParents(includeParents); }, [includeParents, setIncludeParents]);
  const fields = fieldsFor(includeParents);
  const page = usePaged(imp.reviewed, 10);
  const boardLabel = describeBoard(imp.board);
  const boardMissing = imp.needsBoard && !imp.chosenBoard;

  if (imp.result) {
    const r = imp.result;
    const downloadLogins = () => downloadCsv(
      `aivorah-logins-${r.school.replace(/\W+/g, '-').toLowerCase()}.csv`,
      [['Name', 'Role', 'Login email', 'Password', 'Grade', 'Section'].join(','),
        ...r.credentials.map((c) => [c.name, c.role, c.email, c.password, c.grade || '', c.section || ''].map((v) => csvEscape(String(v))).join(','))].join('\n'),
    );
    return (
      <View style={s.card} testID="bulk-sheet-result">
        <View style={s.stepHeader}>
          <View style={[s.stepNum, s.stepNumDone]}><Feather name="check" size={13} color="#FFFFFF" /></View>
          <Text style={s.stepTitle}>Import finished — {r.school}</Text>
        </View>
        <View style={s.statRow}>
          <View style={[s.stat, { borderColor: colors.accentGreen + '55' }]}><Text style={s.statValue}>{r.created}</Text><Text style={s.statLabel}>Students created</Text></View>
          <View style={s.stat}><Text style={s.statValue}>{r.skipped.length}</Text><Text style={s.statLabel}>Already existed</Text></View>
          <View style={[s.stat, r.errors.length > 0 && { borderColor: colors.accentRed + '55' }]}><Text style={s.statValue}>{r.errors.length}</Text><Text style={s.statLabel}>Failed</Text></View>
        </View>

        {(r.errors.length > 0 || r.skipped.length > 0) && (
          <View style={s.tableBox}>
            {r.errors.map((e) => (
              <View key={`e${e.row}`} style={s.tr}><Text style={[s.td, s.tdNarrow]}>Row {e.row}</Text><Text style={[s.td, { color: colors.accentRed, flex: 4 }]}>{e.error}</Text></View>
            ))}
            {r.skipped.map((k) => (
              <View key={`k${k.row}`} style={s.tr}><Text style={[s.td, s.tdNarrow]}>Row {k.row}</Text><Text style={[s.td, { flex: 4 }]}>{k.name} — {k.reason} ({k.email})</Text></View>
            ))}
          </View>
        )}

        {r.credentials.length > 0 && (
          <>
            <View style={s.credHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.subTitle} testID="bulk-sheet-logins-title">{loginsTitle(r.credentials)}</Text>
                <Text style={s.hint}>Passwords are shown only once — download them now. Students and parents with an email on file were also emailed theirs.</Text>
              </View>
              <TouchableOpacity testID="bulk-sheet-download-logins" style={s.btnPrimary} onPress={downloadLogins} activeOpacity={0.85}>
                <Feather name="download" size={14} color="#0B0B0B" />
                <Text style={s.btnPrimaryText}>Download logins (.csv)</Text>
              </TouchableOpacity>
            </View>
            <View style={s.tableBox}>
              <View style={[s.tr, s.thRow]}>
                {CRED_COLS.map(([h, col]) => <Text key={h} style={[s.th, col]} numberOfLines={1}>{h}</Text>)}
              </View>
              {r.credentials.map((c) => (
                <View key={c.email} style={s.tr} testID={`bulk-sheet-cred-${c.email}`}>
                  <Text style={[s.td, CRED.name]} numberOfLines={1}>{c.name}</Text>
                  <View style={CRED.role}><Text style={[s.rolePill, c.role === 'parent' && s.rolePillParent]}>{c.role}</Text></View>
                  <Text style={[s.td, CRED.email]} numberOfLines={1}>{c.email}</Text>
                  <Text style={[s.td, s.mono, CRED.password]} numberOfLines={1} selectable>{c.password}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity testID="bulk-sheet-again" style={[s.btnGhost, { marginTop: 16 }]} onPress={imp.reset}>
          <Feather name="upload" size={14} color={colors.accentYellow} />
          <Text style={s.btnGhostText}>Import another file</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasFile = imp.headers.length > 0;
  const fieldOptions = [{ value: NOT_IMPORTED, label: "Don't import" }, ...fields];

  return (
    <View style={{ gap: 16 }}>
      <Step n={1} title="Choose school" done={!!imp.school} s={s}>
        <View style={s.row}>
          <SelectField
            testID="bulk-sheet-school"
            label="School"
            placeholder={imp.schoolPlaceholder}
            value={imp.schoolId}
            options={imp.schools.map((sc) => ({ value: sc.id, label: sc.name }))}
            onChange={imp.setSchoolId}
            minWidth={280}
          />
          {!!imp.school && (
            <View style={s.boardBox} testID="bulk-sheet-board">
              <Text style={s.boardLabel}>BOARD</Text>
              <View style={s.boardValueBox}>
                <Text style={s.boardValue} numberOfLines={1} testID="bulk-sheet-board-value">
                  {describeBoard(imp.school.curriculum) || (imp.chosenBoard ? `Not set → ${imp.chosenBoard} on import` : 'Not set')}
                </Text>
              </View>
            </View>
          )}
          {imp.needsBoard && !!imp.school && (
            <SchoolCurriculumPicker testID="bulk-sheet-curriculum" schoolName={imp.school.name} value={imp.chosenBoard} onChange={imp.setChosenBoard} />
          )}
        </View>
        <Text style={s.hint} testID="bulk-sheet-accounts-hint">
          {imp.includeParents
            ? 'Rows with a Parent Name also get a parent account, linked to that student.'
            : 'Only student accounts are created — parent columns in the file are ignored.'}
        </Text>
        {!!imp.schoolsError && (
          <TouchableOpacity onPress={imp.loadSchools}><Text style={s.errorText}>{imp.schoolsError} Tap to retry.</Text></TouchableOpacity>
        )}
      </Step>

      <Step
        n={2}
        title="Upload spreadsheet"
        done={hasFile}
        s={s}
        right={(
          <TouchableOpacity testID="bulk-sheet-template" style={[s.btnGhost, { marginLeft: 'auto' as any }]} onPress={() => downloadXlsxTemplate(includeParents ? 'aivorah-students-parents-template.xlsx' : 'aivorah-students-template.xlsx', fields.map((f) => f.label), [fields.map((f) => EXAMPLE[f.value] || '')])}>
            <Feather name="file-text" size={14} color={colors.accentYellow} />
            <Text style={s.btnGhostText}>Download template</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity testID="bulk-sheet-choose" style={s.dropZone} onPress={() => pickFile(imp.loadFile)} activeOpacity={0.8}>
          <Feather name={hasFile ? 'file' : 'upload-cloud'} size={22} color={colors.accentYellow} />
          <Text style={s.dropTitle}>{hasFile ? imp.fileName : 'Choose an Excel or CSV file'}</Text>
          <Text style={s.hint}>
            {hasFile ? `${imp.reviewed.length} student rows found — tap to replace` : '.xlsx, .xls or .csv · first row = column headers · up to 500 students'}
          </Text>
        </TouchableOpacity>
        {!!imp.fileError && <Text style={s.errorText} testID="bulk-sheet-file-error">{imp.fileError}</Text>}

        {hasFile && !imp.columnsOpen && (
          <TouchableOpacity testID="bulk-sheet-columns-edit" style={s.columnsLine} onPress={() => imp.setEditingColumns(true)} activeOpacity={0.7}>
            <Feather name="check" size={13} color={colors.accentGreen} />
            <Text style={[s.hint, { marginTop: 0 }]}>Columns matched automatically · <Text style={s.linkText}>Edit</Text></Text>
          </TouchableOpacity>
        )}
        {hasFile && imp.columnsOpen && (
          <View style={{ marginTop: 14 }} testID="bulk-sheet-columns">
            <Text style={s.subTitle}>Columns</Text>
            <Text style={s.hint}>Matched automatically from your headers — change any that are wrong.</Text>
            <View style={s.mapGrid}>
              {imp.headers.map((h, col) => (
                <View key={`${h}-${col}`} style={s.mapItem}>
                  <Text style={s.mapHeader} numberOfLines={1}>“{h || `Column ${col + 1}`}”</Text>
                  <SelectField
                    testID={`bulk-sheet-map-${col}`}
                    value={imp.columnMap[col] || NOT_IMPORTED}
                    options={fieldOptions}
                    onChange={(v) => imp.setColumnField(col, v === NOT_IMPORTED ? '' : (v as any))}
                    minWidth={180}
                  />
                </View>
              ))}
            </View>
            {!imp.nameMapped && <Text style={s.errorText}>Map one column to Student Name to continue.</Text>}
          </View>
        )}
      </Step>

      {hasFile && imp.nameMapped && (
        <Step n={3} title="Review & import" s={s}>
          <View style={s.pills}>
            <Text style={[s.pill, s.pillOk]} testID="bulk-sheet-ready-count">{imp.readyRows.length} ready</Text>
            {imp.blockedRows.length > 0 && <Text style={[s.pill, s.pillBad]}>{imp.blockedRows.length} need fixing (skipped)</Text>}
            {imp.reviewed.some((r) => r.warnings.length) && <Text style={[s.pill, s.pillWarn]}>{imp.reviewed.filter((r) => r.warnings.length).length} with notes</Text>}
          </View>

          {!!imp.school && !!boardLabel && (
            <Text style={s.curriculumNote} testID="bulk-sheet-curriculum-note">
              {`All students will be enrolled in ${boardLabel} (from ${imp.school.name})`}
            </Text>
          )}
          {imp.includeParents && (
            <Text style={imp.parentMapped ? s.curriculumNote : s.warnText} testID="bulk-sheet-parent-note">
              {imp.parentMapped
                ? `${imp.parentCount} of ${imp.readyRows.length} students will also get a linked parent account`
                : 'No Parent Name column found in this file, so no parent accounts will be created. Map one under "Columns" or add Parent Name / Parent Email / Parent Phone columns.'}
            </Text>
          )}

          <View style={s.tableBox}>
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={s.tableScroll}>
              <View style={{ flex: 1 }}>
                <View style={[s.tr, s.thRow]}>
                  <Text style={[s.th, s.cell, COL.row]} numberOfLines={1}>Row</Text>
                  <Text style={[s.th, s.cell, COL.student]}>Student</Text>
                  <Text style={[s.th, s.cell, COL.grade]}>Grade · Section</Text>
                  <Text style={[s.th, s.cell, COL.curriculum]}>Curriculum</Text>
                  {imp.includeParents && <Text style={[s.th, s.cell, COL.parent]}>Parent</Text>}
                  <Text style={[s.th, s.cell, COL.check]}>Check</Text>
                </View>
                {page.pageRows.map((r) => {
                  const v = r.values;
                  const bad = r.issues.length > 0;
                  return (
                    <View key={r.rowNum} style={[s.tr, bad && s.trBad]} testID={`bulk-sheet-row-${r.rowNum}`}>
                      <Text style={[s.td, s.cell, COL.row]} numberOfLines={1}>{r.rowNum}</Text>
                      <View style={[s.cell, COL.student]}>
                        <Text style={s.tdStrong} numberOfLines={1}>{v.studentName || '—'}</Text>
                        <Text style={s.tdSub} numberOfLines={1}>{v.studentEmail || 'login generated'}</Text>
                      </View>
                      <Text style={[s.td, s.cell, COL.grade]} numberOfLines={1}>{[v.grade, v.section].filter(Boolean).join(' · ') || '—'}</Text>
                      <Text style={[s.td, s.cell, COL.curriculum]} numberOfLines={1} testID={`bulk-sheet-row-${r.rowNum}-curriculum`}>{r.curriculum || '—'}</Text>
                      {imp.includeParents && (
                        <View style={[s.cell, COL.parent]} testID={`bulk-sheet-row-${r.rowNum}-parent`}>
                          <Text style={s.tdStrong} numberOfLines={1}>{v.parentName || '—'}</Text>
                          {!!v.parentName && <Text style={s.tdSub} numberOfLines={1}>{v.parentEmail || 'login generated'}{v.parentPhone ? ` · ${v.parentPhone}` : ''}</Text>}
                        </View>
                      )}
                      <View style={[s.cell, COL.check]}>
                        {bad
                          ? r.issues.map((t) => <Text key={t} style={s.issueText}>✕ {t}</Text>)
                          : r.warnings.length
                            ? r.warnings.map((t) => <Text key={t} style={s.warnText}>! {t}</Text>)
                            : <Text style={s.okText}>✓ Ready</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
              <TablePager testIDPrefix="bulk-sheet-page" colors={colors} {...page} />
            </View>
          </View>

          {!!imp.submitError && <Text style={s.errorText} testID="bulk-sheet-submit-error">{imp.submitError}</Text>}
          <TouchableOpacity
            testID="bulk-sheet-import"
            style={[s.submitBtn, (!imp.schoolId || !imp.readyRows.length || boardMissing) && { opacity: 0.55 }]}
            onPress={imp.submit}
            disabled={imp.submitting || boardMissing}
            activeOpacity={0.85}
          >
            {imp.submitting ? <ActivityIndicator color="#0B0B0B" size="small" /> : (
              <>
                <Feather name="upload" size={15} color="#0B0B0B" />
                <Text style={s.btnPrimaryText}>
                  {boardMissing ? 'Choose a curriculum to import' : imp.school
                    ? `Import ${imp.readyRows.length} student${imp.readyRows.length !== 1 ? 's' : ''}`
                    : 'Choose a school to import'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Step>
      )}
    </View>
  );
}

export function makeStyles(c: AppColors) {
  return StyleSheet.create({
    card: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.md, padding: 20 },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
    stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentYellow + '1F' },
    stepNumDone: { backgroundColor: c.accentYellow },
    stepNumText: { fontSize: 12.5, fontWeight: '800', color: c.accentYellow },
    stepTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800', color: c.textHeading },
    // Top-aligned so labels line up even when a field has a hint underneath.
    row: { flexDirection: 'row', columnGap: 16, rowGap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
    boardBox: { minWidth: 140 },
    boardLabel: { fontSize: 11, fontWeight: '700', color: c.textDim, letterSpacing: 0.4 },
    // Same height/offset as SelectField's trigger, so the value sits on the selects' centre line.
    boardValueBox: { height: 36, marginTop: 6, justifyContent: 'center' },
    boardValue: { fontSize: 13, fontWeight: '600', color: c.textMain },
    hint: { fontSize: 11.5, color: c.textDim, marginTop: 4, lineHeight: 16 },
    subTitle: { fontSize: 13, fontWeight: '800', color: c.textHeading },
    errorText: { fontSize: 12.5, color: c.accentRed, marginTop: 8 },
    dropZone: {
      alignItems: 'center', gap: 6, paddingVertical: 26, paddingHorizontal: 16, borderRadius: radius.md,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.accentYellow + '70', backgroundColor: c.accentYellow + '0A',
    },
    dropTitle: { fontSize: 14, fontWeight: '700', color: c.textMain },
    mapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
    mapItem: { minWidth: 180, flexGrow: 1, flexBasis: 200 },
    columnsLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
    linkText: { color: c.accentYellow, fontWeight: '700' },
    curriculumNote: { fontSize: 12.5, fontWeight: '600', color: c.textMain, marginBottom: 10 },
    mapHeader: { fontSize: 11.5, color: c.textMuted, fontWeight: '600' },
    pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
    pill: { fontSize: 11.5, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, overflow: 'hidden' },
    pillOk: { color: c.accentGreen, backgroundColor: c.accentGreen + '1A' },
    pillBad: { color: c.accentRed, backgroundColor: c.accentRed + '1A' },
    pillWarn: { color: c.accentOrange, backgroundColor: c.accentOrange + '1A' },
    tableBox: { borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.sm, overflow: 'hidden', marginTop: 4 },
    tr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.borderColor },
    thRow: { backgroundColor: c.textHeading + '12' },
    trBad: { backgroundColor: c.accentRed + '0D' },
    th: { flex: 1, fontSize: 11.5, fontWeight: '800', color: c.textMain },
    td: { flex: 1, fontSize: 12.5, color: c.textMain },
    tdNarrow: { flexGrow: 0, flexShrink: 0, flexBasis: 64, width: 64 },
    cell: { flexBasis: 0, minWidth: 0 },
    tableScroll: { flexGrow: 1, minWidth: 760 },
    tdStrong: { fontSize: 12.5, fontWeight: '700', color: c.textHeading },
    tdSub: { fontSize: 11, color: c.textDim, marginTop: 1 },
    mono: { fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined },
    issueText: { fontSize: 11.5, color: c.accentRed },
    warnText: { fontSize: 11.5, color: c.accentOrange },
    okText: { fontSize: 11.5, fontWeight: '700', color: c.accentGreen },
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, alignSelf: 'flex-end',
      backgroundColor: c.accentYellow, borderRadius: radius.sm, paddingHorizontal: 18, paddingVertical: 10,
    },
    btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.accentYellow, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10 },
    btnPrimaryText: { fontSize: 13.5, fontWeight: '700', color: '#0B0B0B' },
    btnGhost: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor },
    btnGhostText: { fontSize: 12.5, fontWeight: '700', color: c.accentYellow },
    statRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
    stat: { flexGrow: 1, flexBasis: 140, padding: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark },
    statValue: { fontFamily: fonts.serif, fontSize: 22, fontWeight: '800', color: c.textHeading },
    statLabel: { fontSize: 11.5, color: c.textDim, marginTop: 2 },
    credHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 8, flexWrap: 'wrap' },
    rolePill: { alignSelf: 'flex-start', fontSize: 10.5, fontWeight: '700', color: c.accentBlue, backgroundColor: c.accentBlue + '1A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, overflow: 'hidden', textTransform: 'capitalize' },
    rolePillParent: { color: c.accentOrange, backgroundColor: c.accentOrange + '1A' },
  });
}
