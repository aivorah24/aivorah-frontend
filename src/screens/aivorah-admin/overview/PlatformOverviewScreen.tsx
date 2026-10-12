import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { makeStyles } from './styles';
import { usePlatformOverview } from './hooks/usePlatformOverview';
import KpiCard from './components/KpiCard';
import DistributionCard from './components/DistributionCard';
import SortableHeaderCell from './components/SortableHeaderCell';
import { toCsv, downloadCsv } from './utils/csv';
import { sortRows, filterByText, toggleSort, type SortState } from '../shared/tableControls';
import { normalizeGrade, normalizeCurriculum, mergeCounts, compareGrades } from '../shared/academicLabels';
import { TablePager, usePaged } from '../shared/TablePager';
import type { OverviewStudent, OverviewPerson } from './types';

type StudentSegment = 'all' | 'b2b' | 'b2c';

export default function PlatformOverviewScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    data, charts, loading, error, load,
    b2bStudents, b2cStudents, schoolCount, b2bSharePct, schoolDrilldown,
    onboardingRatePct, avgStreak, lastSeenStudents,
  } = usePlatformOverview();
  const [studentSegment, setStudentSegment] = useState<StudentSegment>('all');
  const [studentQuery, setStudentQuery] = useState('');
  const [studentSort, setStudentSort] = useState<SortState<OverviewStudent>>({ key: null, dir: 'asc' });
  const [teacherQuery, setTeacherQuery] = useState('');
  const [teacherSort, setTeacherSort] = useState<SortState<OverviewPerson>>({ key: null, dir: 'asc' });
  const [parentQuery, setParentQuery] = useState('');
  const [parentSort, setParentSort] = useState<SortState<OverviewPerson>>({ key: null, dir: 'asc' });

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const counts = data?.counts;
  const segmentedStudents = useMemo(() => {
    const bySegment = (data?.students || []).filter((s) => (
      studentSegment === 'all' ? true : studentSegment === 'b2b' ? !!s.school : !s.school
    ));
    const searched = filterByText(bySegment, studentQuery, ['name', 'email', 'grade', 'curriculum']);
    return sortRows(searched, studentSort);
  }, [data?.students, studentSegment, studentQuery, studentSort]);

  const sortedTeachers = useMemo(() => {
    const searched = filterByText(data?.teachers || [], teacherQuery, ['name', 'email', 'school']);
    return sortRows(searched, teacherSort);
  }, [data?.teachers, teacherQuery, teacherSort]);

  const sortedParents = useMemo(() => {
    const searched = filterByText(data?.parents || [], parentQuery, ['name', 'email', 'location']);
    return sortRows(searched, parentSort);
  }, [data?.parents, parentQuery, parentSort]);

  const studentPage = usePaged(segmentedStudents);
  const teacherPage = usePaged(sortedTeachers);
  const parentPage = usePaged(sortedParents);

  const curriculumRows = useMemo(
    () => mergeCounts(charts?.curriculumMap ?? {}, normalizeCurriculum).sort((a, b) => b.value - a.value),
    [charts],
  );
  const gradeRows = useMemo(
    () => mergeCounts(charts?.gradeMap ?? {}, normalizeGrade).sort((a, b) => compareGrades(a.label, b.label)),
    [charts],
  );

  function exportStudentsCsv() {
    const csv = toCsv(
      ['Name', 'Email', 'Grade', 'Curriculum', 'School', 'XP', 'Streak', 'Topics Completed', 'Study Time (min)', 'Onboarded'],
      (data?.students || []).map((s) => [
        s.name, s.email, s.grade, s.curriculum, s.school || 'B2C', s.xpPoints, s.currentStreak,
        s.completedTopicsCount, s.studyTimeMinutes, s.onboardingComplete ? 'Yes' : 'No',
      ])
    );
    downloadCsv('aivorah-students.csv', csv);
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Header title="Platform Overview" subtitle="Registered accounts and school-by-school activity, platform-wide." onMenuPress={() => navigation?.openDrawer?.()} />
          </View>
          <TouchableOpacity testID="overview-refresh-button" style={styles.refreshBtn} onPress={() => load()} activeOpacity={0.8}>
            <Feather name="refresh-cw" size={14} color={colors.textMain} />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

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
            <Text style={styles.sectionTitle}>PLATFORM OVERVIEW</Text>
            <View style={styles.kpiGrid}>
              <KpiCard icon="users" color={colors.accentCyan} value={counts?.users ?? 0} label="Total Users · Registered accounts" colors={colors} styles={styles} />
              <KpiCard icon="book-open" color={colors.accentYellow} value={counts?.students ?? 0} label="Students · Active learners" colors={colors} styles={styles} />
              <KpiCard icon="monitor" color={colors.accentRed} value={counts?.teachers ?? 0} label="Teachers · Educators onboard" colors={colors} styles={styles} />
              <KpiCard icon="heart" color="#a78bfa" value={counts?.parents ?? 0} label="Parents · Family engaged" colors={colors} styles={styles} />
              <KpiCard icon="star" color={colors.accentYellow} value={(counts?.totalXP ?? 0).toLocaleString()} label="Total XP Earned · Across all students" colors={colors} styles={styles} />
              <KpiCard icon="file-text" color={colors.accentCyan} value={counts?.assignments ?? 0} label={`Assignments · ${counts?.assignmentsCompleted ?? 0} completed`} colors={colors} styles={styles} />
              <KpiCard icon="check-circle" color={colors.accentYellow} value={`${onboardingRatePct}%`} label="Onboarding Rate · Students who finished setup" colors={colors} styles={styles} />
              <KpiCard icon="zap" color={colors.accentRed} value={`${avgStreak}d`} label="Avg Streak · Across all students" colors={colors} styles={styles} />
            </View>

            <Text style={styles.sectionTitle}>B2B VS B2C SPLIT</Text>
            <View style={styles.kpiGrid}>
              <KpiCard icon="briefcase" color={colors.accentCyan} value={b2bStudents.length} label="B2B Students · School-enrolled" colors={colors} styles={styles} />
              <KpiCard icon="heart" color={colors.accentRed} value={b2cStudents.length} label="B2C Students · Parent-enrolled (direct)" colors={colors} styles={styles} />
              <KpiCard icon="monitor" color={colors.accentYellow} value={schoolCount} label="Schools · Institutions onboard" colors={colors} styles={styles} />
              <KpiCard icon="bar-chart-2" color="#a78bfa" value={`${b2bSharePct}%`} label="B2B Share · Of total students" colors={colors} styles={styles} />
            </View>

            <Text style={styles.sectionTitle}>SCHOOL DRILL-DOWN</Text>
            <View style={styles.table}>
              <Text style={styles.tableHeading}>Schools ({schoolDrilldown.length})</Text>
              <Text style={styles.tableSubheading}>Students and teachers per institution</Text>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>SCHOOL</Text>
                <Text style={styles.tableHeaderCell}>STUDENTS</Text>
                <Text style={styles.tableHeaderCell}>TEACHERS</Text>
                <Text style={styles.tableHeaderCell}>AVG XP / STUDENT</Text>
                <Text style={styles.tableHeaderCell}>TOTAL XP</Text>
              </View>
              {schoolDrilldown.length === 0 ? (
                <Text style={styles.emptyRowText}>No B2B schools yet.</Text>
              ) : (
                schoolDrilldown.map((row) => (
                  <View key={row.school} style={styles.tableRow} testID={`overview-school-row-${row.school}`}>
                    <Text style={[styles.tableCell, styles.tableCellSchool, { flex: 2 }]}>{row.school}</Text>
                    <Text style={styles.tableCell}>{row.students}</Text>
                    <Text style={styles.tableCell}>{row.teachers}</Text>
                    <Text style={[styles.tableCell, { color: colors.accentCyan }]}>{row.avgXP.toLocaleString()}</Text>
                    <Text style={styles.tableCell}>{row.totalXP.toLocaleString()}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionTitle}>DISTRIBUTION</Text>
            <View style={styles.distGrid}>
              <DistributionCard
                title="Users by Role"
                color={colors.accentCyan}
                styles={styles}
                rows={charts ? [
                  { label: 'Students', value: charts.roleCounts.student },
                  { label: 'Teachers', value: charts.roleCounts.teacher },
                  { label: 'Parents', value: charts.roleCounts.parent },
                ] : []}
              />
              <DistributionCard
                title="Curriculum Split"
                color={colors.accentYellow}
                styles={styles}
                rows={curriculumRows}
              />
              <DistributionCard
                title="Grade Distribution"
                color="#a78bfa"
                styles={styles}
                rows={gradeRows}
              />
              <DistributionCard
                title="Assignments by Type"
                color={colors.accentRed}
                styles={styles}
                rows={Object.entries(charts?.assignmentStats.byType ?? {}).map(([label, value]) => ({ label, value }))}
              />
            </View>

            <Text style={styles.sectionTitle}>LAST SEEN</Text>
            <View style={styles.table}>
              <Text style={styles.tableHeading}>Most Recently Active Students</Text>
              <Text style={styles.tableSubheading}>Based on their last progress update</Text>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>STUDENT</Text>
                <Text style={styles.tableHeaderCell}>GRADE</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>LAST ACTIVE</Text>
              </View>
              {lastSeenStudents.length === 0 ? (
                <Text style={styles.emptyRowText}>No activity logged yet.</Text>
              ) : (
                lastSeenStudents.map((s) => (
                  <View key={s.id} style={styles.tableRow} testID={`overview-lastseen-row-${s.id}`}>
                    <Text style={[styles.tableCell, styles.tableCellSchool, { flex: 2 }]}>{s.name || s.email}</Text>
                    <Text style={styles.tableCell}>{normalizeGrade(s.grade) || '—'}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{new Date(s.lastSeen as string).toLocaleString()}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionTitle}>STUDENTS</Text>
            <View style={styles.table}>
              <View style={styles.tableToolbar}>
                <View>
                  <Text style={styles.tableHeading}>Students ({(data?.students || []).length})</Text>
                  <Text style={styles.tableSubheading}>Enrolled learners with progress data</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <TextInput
                    testID="overview-student-search"
                    style={styles.searchInput}
                    placeholder="Search by name, email, grade…"
                    placeholderTextColor={colors.textDim}
                    value={studentQuery}
                    onChangeText={setStudentQuery}
                  />
                  <View style={styles.filterTabs}>
                    {(['all', 'b2b', 'b2c'] as StudentSegment[]).map((seg) => (
                      <TouchableOpacity
                        key={seg}
                        testID={`overview-student-filter-${seg}`}
                        style={[styles.filterTab, studentSegment === seg && styles.filterTabActive]}
                        onPress={() => setStudentSegment(seg)}
                      >
                        <Text style={[styles.filterTabText, studentSegment === seg && styles.filterTabTextActive]}>
                          {seg === 'all' ? `All (${(data?.students || []).length})` : seg === 'b2b' ? `B2B (${b2bStudents.length})` : `B2C (${b2cStudents.length})`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {Platform.OS === 'web' && (
                    <TouchableOpacity testID="overview-export-students" style={styles.exportBtn} onPress={exportStudentsCsv} activeOpacity={0.8}>
                      <Feather name="download" size={13} color={colors.textMain} />
                      <Text style={styles.exportBtnText}>Export CSV</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.tableHeaderRow}>
                <SortableHeaderCell label="NAME" flexGrow={2} testID="overview-student-sort-name" colors={colors} styles={styles}
                  active={studentSort.key === 'name'} dir={studentSort.dir} onPress={() => setStudentSort((s) => toggleSort(s, 'name'))} />
                <SortableHeaderCell label="GRADE" testID="overview-student-sort-grade" colors={colors} styles={styles}
                  active={studentSort.key === 'grade'} dir={studentSort.dir} onPress={() => setStudentSort((s) => toggleSort(s, 'grade'))} />
                <SortableHeaderCell label="CURRICULUM" testID="overview-student-sort-curriculum" colors={colors} styles={styles}
                  active={studentSort.key === 'curriculum'} dir={studentSort.dir} onPress={() => setStudentSort((s) => toggleSort(s, 'curriculum'))} />
                <SortableHeaderCell label="XP" testID="overview-student-sort-xp" colors={colors} styles={styles}
                  active={studentSort.key === 'xpPoints'} dir={studentSort.dir} onPress={() => setStudentSort((s) => toggleSort(s, 'xpPoints'))} />
                <SortableHeaderCell label="STREAK" testID="overview-student-sort-streak" colors={colors} styles={styles}
                  active={studentSort.key === 'currentStreak'} dir={studentSort.dir} onPress={() => setStudentSort((s) => toggleSort(s, 'currentStreak'))} />
                <SortableHeaderCell label="TOPICS" testID="overview-student-sort-topics" colors={colors} styles={styles}
                  active={studentSort.key === 'completedTopicsCount'} dir={studentSort.dir} onPress={() => setStudentSort((s) => toggleSort(s, 'completedTopicsCount'))} />
                <Text style={styles.tableHeaderCell}>ONBOARDED</Text>
              </View>
              {segmentedStudents.length === 0 ? (
                <Text style={styles.emptyRowText}>No students match this filter/search.</Text>
              ) : (
                <View>
                  {studentPage.pageRows.map((s, i) => (
                    <View key={s.id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]} testID={`overview-student-row-${s.id}`}>
                      <Text style={[styles.tableCell, styles.tableCellSchool, { flex: 2 }]}>{s.name || s.email}</Text>
                      <Text style={styles.tableCell}>{normalizeGrade(s.grade) || '—'}</Text>
                      <Text style={styles.tableCell}>{normalizeCurriculum(s.curriculum) || '—'}</Text>
                      <Text style={[styles.tableCell, { color: colors.accentCyan }]}>{s.xpPoints.toLocaleString()}</Text>
                      <Text style={styles.tableCell}>{s.currentStreak}d</Text>
                      <Text style={styles.tableCell}>{s.completedTopicsCount}</Text>
                      <Text style={styles.tableCell}>{s.onboardingComplete ? '✓' : '✗'}</Text>
                    </View>
                  ))}
                  <TablePager testIDPrefix="overview-student-page" colors={colors} {...studentPage} />
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>TEACHERS &amp; PARENTS</Text>
            <View style={styles.tableHalfGrid}>
              <View style={[styles.table, styles.tableHalf]}>
                <View style={styles.tableToolbar}>
                  <Text style={styles.tableHeading}>Teachers ({(data?.teachers || []).length})</Text>
                  <TextInput
                    testID="overview-teacher-search"
                    style={styles.searchInput}
                    placeholder="Search teachers…"
                    placeholderTextColor={colors.textDim}
                    value={teacherQuery}
                    onChangeText={setTeacherQuery}
                  />
                </View>
                <View style={styles.tableHeaderRow}>
                  <SortableHeaderCell label="NAME" flexGrow={2} testID="overview-teacher-sort-name" colors={colors} styles={styles}
                    active={teacherSort.key === 'name'} dir={teacherSort.dir} onPress={() => setTeacherSort((s) => toggleSort(s, 'name'))} />
                  <SortableHeaderCell label="SCHOOL" testID="overview-teacher-sort-school" colors={colors} styles={styles}
                    active={teacherSort.key === 'school'} dir={teacherSort.dir} onPress={() => setTeacherSort((s) => toggleSort(s, 'school'))} />
                </View>
                {sortedTeachers.length === 0 ? (
                  <Text style={styles.emptyRowText}>No teachers match.</Text>
                ) : (
                  <View>
                    {teacherPage.pageRows.map((t, i) => (
                      <View key={t.id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]} testID={`overview-teacher-row-${t.id}`}>
                        <Text style={[styles.tableCell, styles.tableCellSchool, { flex: 2 }]}>{t.name || t.email}</Text>
                        <Text style={styles.tableCell}>{t.school || '—'}</Text>
                      </View>
                    ))}
                    <TablePager testIDPrefix="overview-teacher-page" colors={colors} {...teacherPage} />
                  </View>
                )}
              </View>
              <View style={[styles.table, styles.tableHalf]}>
                <View style={styles.tableToolbar}>
                  <Text style={styles.tableHeading}>Parents ({(data?.parents || []).length})</Text>
                  <TextInput
                    testID="overview-parent-search"
                    style={styles.searchInput}
                    placeholder="Search parents…"
                    placeholderTextColor={colors.textDim}
                    value={parentQuery}
                    onChangeText={setParentQuery}
                  />
                </View>
                <View style={styles.tableHeaderRow}>
                  <SortableHeaderCell label="NAME" flexGrow={2} testID="overview-parent-sort-name" colors={colors} styles={styles}
                    active={parentSort.key === 'name'} dir={parentSort.dir} onPress={() => setParentSort((s) => toggleSort(s, 'name'))} />
                  <SortableHeaderCell label="LOCATION" testID="overview-parent-sort-location" colors={colors} styles={styles}
                    active={parentSort.key === 'location'} dir={parentSort.dir} onPress={() => setParentSort((s) => toggleSort(s, 'location'))} />
                </View>
                {sortedParents.length === 0 ? (
                  <Text style={styles.emptyRowText}>No parents match.</Text>
                ) : (
                  <View>
                    {parentPage.pageRows.map((p, i) => (
                      <View key={p.id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]} testID={`overview-parent-row-${p.id}`}>
                        <Text style={[styles.tableCell, styles.tableCellSchool, { flex: 2 }]}>{p.name || p.email}</Text>
                        <Text style={styles.tableCell}>{p.location || '—'}</Text>
                      </View>
                    ))}
                    <TablePager testIDPrefix="overview-parent-page" colors={colors} {...parentPage} />
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}
