import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { csvEscape, downloadCsv, downloadXlsxTemplate } from '../../../../utils/spreadsheet';
import { describeBoard } from '../../shared/academicLabels';
import { SelectField } from '../../shared/SelectField';
import { TablePager, usePaged } from '../../shared/TablePager';
import { useTeacherImport } from '../hooks/useTeacherImport';
import { TEACHER_IMPORT_FIELDS } from '../utils/reviewTeacherRows';
import { Step, makeStyles, pickFile } from './SpreadsheetImportPanel';

const TEMPLATE_HEADERS = TEACHER_IMPORT_FIELDS.map((f) => f.label);
const TEMPLATE_EXAMPLES = [
  ['Priya Sharma', 'priya.sharma@example.com', '9876543210', 'Grade 3 | Grade 4', 'Maths | Science; English'],
  ['Rahul Sen', '', '', 'Grade 7', 'Physics'],
];
const NOT_IMPORTED = '__none__';

const COL = StyleSheet.create({
  row: { flexGrow: 0, flexShrink: 0, flexBasis: 44, width: 44, minWidth: 44 },
  teacher: { flex: 1.5 },
  grade: { flex: 1 },
  subjects: { flex: 1.3 },
  check: { flex: 1.6 },
});

const CRED = StyleSheet.create({
  name: { flexGrow: 1.2, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  email: { flexGrow: 1.8, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  teaches: { flexGrow: 1.2, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  password: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
});

export function TeacherImportPanel() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const imp = useTeacherImport();
  const page = usePaged(imp.reviewed, 10);

  if (imp.result) {
    const r = imp.result;
    const downloadLogins = () => downloadCsv(
      `aivorah-teacher-logins-${r.school.replace(/\W+/g, '-').toLowerCase()}.csv`,
      [['Name', 'Role', 'Login email', 'Password', 'Grades', 'Subjects'].join(','),
        ...r.credentials.map((c) => [c.name, c.role, c.email, c.password, c.grade || '', (c.subjects || []).join('; ')].map((v) => csvEscape(String(v))).join(','))].join('\n'),
    );
    return (
      <View style={s.card} testID="bulk-teacher-result">
        <View style={s.stepHeader}>
          <View style={[s.stepNum, s.stepNumDone]}><Feather name="check" size={13} color="#FFFFFF" /></View>
          <Text style={s.stepTitle}>Import finished — {r.school}</Text>
        </View>
        <View style={s.statRow}>
          <View style={[s.stat, { borderColor: colors.accentGreen + '55' }]}><Text style={s.statValue}>{r.created}</Text><Text style={s.statLabel}>Teachers created</Text></View>
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
                <Text style={s.subTitle} testID="bulk-teacher-logins-title">Logins — {r.credentials.length} teacher{r.credentials.length !== 1 ? 's' : ''}</Text>
                <Text style={s.hint}>Passwords are shown only once — download them now. Teachers with an email in the sheet were also emailed theirs; the rest use the generated login.</Text>
              </View>
              <TouchableOpacity testID="bulk-teacher-download-logins" style={s.btnPrimary} onPress={downloadLogins} activeOpacity={0.85}>
                <Feather name="download" size={14} color="#0B0B0B" />
                <Text style={s.btnPrimaryText}>Download logins (.csv)</Text>
              </TouchableOpacity>
            </View>
            <View style={s.tableBox}>
              <View style={[s.tr, s.thRow]}>
                <Text style={[s.th, CRED.name]}>Name</Text>
                <Text style={[s.th, CRED.email]}>Login email</Text>
                <Text style={[s.th, CRED.teaches]}>Teaches</Text>
                <Text style={[s.th, CRED.password]}>Password</Text>
              </View>
              {r.credentials.map((c) => (
                <View key={c.email} style={s.tr} testID={`bulk-teacher-cred-${c.email}`}>
                  <Text style={[s.td, CRED.name]} numberOfLines={1}>{c.name}</Text>
                  <Text style={[s.td, CRED.email]} numberOfLines={1}>{c.email}</Text>
                  <Text style={[s.td, CRED.teaches]} numberOfLines={2}>{[c.grade, (c.subjects || []).join(', ')].filter(Boolean).join(' · ') || '—'}</Text>
                  <Text style={[s.td, s.mono, CRED.password]} numberOfLines={1} selectable>{c.password}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity testID="bulk-teacher-again" style={[s.btnGhost, { marginTop: 16 }]} onPress={imp.reset}>
          <Feather name="upload" size={14} color={colors.accentYellow} />
          <Text style={s.btnGhostText}>Import another file</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasFile = imp.headers.length > 0;
  const fieldOptions = [{ value: NOT_IMPORTED, label: "Don't import" }, ...TEACHER_IMPORT_FIELDS];
  const boardLabel = describeBoard(imp.school?.curriculum || null);

  return (
    <View style={{ gap: 16 }}>
      <Step n={1} title="Choose school" done={!!imp.school} s={s}>
        <View style={s.row}>
          <SelectField
            testID="bulk-teacher-school"
            label="School"
            placeholder={imp.schoolPlaceholder}
            value={imp.schoolId}
            options={imp.schools.map((sc) => ({ value: sc.id, label: sc.name }))}
            onChange={imp.setSchoolId}
            minWidth={280}
          />
        </View>
        <Text style={s.hint}>Teachers join this school. Each grade&apos;s curriculum comes from the school&apos;s board{boardLabel ? ` (${boardLabel})` : ''}.</Text>
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
          <TouchableOpacity testID="bulk-teacher-template" style={[s.btnGhost, { marginLeft: 'auto' as any }]} onPress={() => downloadXlsxTemplate('aivorah-teachers-template.xlsx', TEMPLATE_HEADERS, TEMPLATE_EXAMPLES)}>
            <Feather name="file-text" size={14} color={colors.accentYellow} />
            <Text style={s.btnGhostText}>Download template</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity testID="bulk-teacher-choose" style={s.dropZone} onPress={() => pickFile(imp.loadFile)} activeOpacity={0.8}>
          <Feather name={hasFile ? 'file' : 'upload-cloud'} size={22} color={colors.accentYellow} />
          <Text style={s.dropTitle}>{hasFile ? imp.fileName : 'Choose an Excel or CSV file'}</Text>
          <Text style={s.hint}>
            {hasFile ? `${imp.reviewed.length} teacher rows found — tap to replace` : 'Teacher Name, Email, Phone, Grade, Subjects · use "|" for several grades, e.g. Grade 3 | Grade 4'}
          </Text>
        </TouchableOpacity>
        {!!imp.fileError && <Text style={s.errorText} testID="bulk-teacher-file-error">{imp.fileError}</Text>}

        {hasFile && !imp.columnsOpen && (
          <TouchableOpacity testID="bulk-teacher-columns-edit" style={s.columnsLine} onPress={() => imp.setEditingColumns(true)} activeOpacity={0.7}>
            <Feather name="check" size={13} color={colors.accentGreen} />
            <Text style={[s.hint, { marginTop: 0 }]}>Columns matched automatically · <Text style={s.linkText}>Edit</Text></Text>
          </TouchableOpacity>
        )}
        {hasFile && imp.columnsOpen && (
          <View style={{ marginTop: 14 }} testID="bulk-teacher-columns">
            <Text style={s.subTitle}>Columns</Text>
            <Text style={s.hint}>Matched automatically from your headers — change any that are wrong.</Text>
            <View style={s.mapGrid}>
              {imp.headers.map((h, col) => (
                <View key={`${h}-${col}`} style={s.mapItem}>
                  <Text style={s.mapHeader} numberOfLines={1}>“{h || `Column ${col + 1}`}”</Text>
                  <SelectField
                    testID={`bulk-teacher-map-${col}`}
                    value={imp.columnMap[col] || NOT_IMPORTED}
                    options={fieldOptions}
                    onChange={(v) => imp.setColumnField(col, v === NOT_IMPORTED ? '' : (v as any))}
                    minWidth={180}
                  />
                </View>
              ))}
            </View>
            {!imp.nameMapped && <Text style={s.errorText}>Map one column to Teacher Name to continue.</Text>}
          </View>
        )}
      </Step>

      {hasFile && imp.nameMapped && (
        <Step n={3} title="Review & import" s={s}>
          <View style={s.pills}>
            <Text style={[s.pill, s.pillOk]} testID="bulk-teacher-ready-count">{imp.readyRows.length} ready</Text>
            {imp.blockedRows.length > 0 && <Text style={[s.pill, s.pillBad]}>{imp.blockedRows.length} need fixing (skipped)</Text>}
          </View>
          <View style={s.tableBox}>
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={s.tableScroll}>
              <View style={{ flex: 1 }}>
                <View style={[s.tr, s.thRow]}>
                  <Text style={[s.th, s.cell, COL.row]} numberOfLines={1}>Row</Text>
                  <Text style={[s.th, s.cell, COL.teacher]}>Teacher · login</Text>
                  <Text style={[s.th, s.cell, COL.grade]}>Grades</Text>
                  <Text style={[s.th, s.cell, COL.subjects]}>Subjects</Text>
                  <Text style={[s.th, s.cell, COL.check]}>Check</Text>
                </View>
                {page.pageRows.map((r) => {
                  const v = r.values;
                  const bad = r.issues.length > 0;
                  return (
                    <View key={r.rowNum} style={[s.tr, bad && s.trBad]} testID={`bulk-teacher-row-${r.rowNum}`}>
                      <Text style={[s.td, s.cell, COL.row]} numberOfLines={1}>{r.rowNum}</Text>
                      <View style={[s.cell, COL.teacher]}>
                        <Text style={s.tdStrong} numberOfLines={1}>{v.teacherName || '—'}</Text>
                        <Text style={s.tdSub} numberOfLines={1}>{v.email || 'login generated'}{v.phone ? ` · ${v.phone}` : ''}</Text>
                      </View>
                      <Text style={[s.td, s.cell, COL.grade]} numberOfLines={2}>{v.grade || '—'}</Text>
                      <Text style={[s.td, s.cell, COL.subjects]} numberOfLines={2}>{v.subjects || '—'}</Text>
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
              <TablePager testIDPrefix="bulk-teacher-page" colors={colors} {...page} />
            </View>
          </View>

          {!!imp.submitError && <Text style={s.errorText} testID="bulk-teacher-submit-error">{imp.submitError}</Text>}
          <TouchableOpacity
            testID="bulk-teacher-import"
            style={[s.submitBtn, (!imp.schoolId || !imp.readyRows.length) && { opacity: 0.55 }]}
            onPress={imp.submit}
            disabled={imp.submitting}
            activeOpacity={0.85}
          >
            {imp.submitting ? <ActivityIndicator color="#0B0B0B" size="small" /> : (
              <>
                <Feather name="upload" size={15} color="#0B0B0B" />
                <Text style={s.btnPrimaryText}>
                  {imp.school ? `Import ${imp.readyRows.length} teacher${imp.readyRows.length !== 1 ? 's' : ''}` : 'Choose a school to import'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Step>
      )}
    </View>
  );
}
