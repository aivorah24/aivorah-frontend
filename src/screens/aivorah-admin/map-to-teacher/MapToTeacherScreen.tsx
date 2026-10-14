import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { makeStyles } from './styles';
import { useMapToTeacher } from './hooks/useMapToTeacher';
import { filterByText } from '../shared/tableControls';
import { getGradesForCurriculum, getSubjectsForEntry } from '../../school-admin/teachers/utils/teachingEntries';
import { normalizeGrade, normalizeCurriculum, teacherFits, subjectsFor, type TeachingContext } from './utils/teacherMatch';
import type { AdminStudent, AdminTeacher } from './types';
import { isTestLabel, isUnknownLabel, curriculaForBoard, compareGrades } from '../shared/academicLabels';
import { StudentRosterTable } from './components/StudentRosterTable';
import { SelectField } from '../shared/SelectField';

function initialsOf(name: string): string {
  const w = (name || '?').trim().split(/\s+/);
  return ((w[0]?.[0] || '') + (w[1]?.[0] || '')).toUpperCase() || '?';
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export default function MapToTeacherScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    students, teachers, schools, visibleStudents, loading, error, load,
    onlyUnassigned, setOnlyUnassigned,
    selectedStudentIds, toggleStudent,
    teacherEmail, setTeacherEmail,
    subjectsText, setSubjectsText, subjects,
    assigning, assignError, assignedCount, assign,
  } = useMapToTeacher();

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  // Search + grade/school filter chips — client-side only, same pattern as
  // the Overview screen's Students table, so an admin finds a student the
  // same way across both screens instead of scrolling 158 rows by hand.
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [curriculumFilter, setCurriculumFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort(naturalSort);
  const matchSchool = (s: AdminStudent) => schoolFilter === 'all' || s.school === schoolFilter;
  const matchCurriculum = (s: AdminStudent) => curriculumFilter === 'all' || normalizeCurriculum(s.curriculum) === curriculumFilter;
  const matchGrade = (s: AdminStudent) => gradeFilter === 'all' || normalizeGrade(s.grade) === gradeFilter;
  const matchSection = (s: AdminStudent) => sectionFilter === 'all' || (s.section || '').trim() === sectionFilter;

  const clean = (xs: string[]) => uniq(xs).filter((x) => !isTestLabel(x) && !isUnknownLabel(x));
  const gradeRange = (curricula: string[]) =>
    [...new Set(curricula.flatMap(getGradesForCurriculum))].filter((g) => /^Grade \d+$/.test(g)).sort(compareGrades);

  // The chosen school's board (e.g. TSRA → IB) limits Curriculum to that board's programmes,
  // and a curriculum limits Grade to its range (PYP 1–5, MYP 6–10, DP 11–12). Schools with no
  // board saved fall back to whatever the student data holds.
  const boardCurricula = useMemo(() => {
    if (schoolFilter === 'all') return null;
    return curriculaForBoard(schools.find((s) => s.name === schoolFilter)?.curriculum);
  }, [schools, schoolFilter]);

  // Top-down cascade: each dropdown only offers values valid under the ones before it.
  const schoolOptions = useMemo(() => uniq(students.map((s) => s.school)), [students]);
  const curriculumOptions = useMemo(
    () => boardCurricula ?? clean(students.filter(matchSchool).map((s) => normalizeCurriculum(s.curriculum))),
    [students, schoolFilter, boardCurricula],
  );
  const gradeOptions = useMemo(() => {
    if (curriculumFilter !== 'all') return gradeRange([curriculumFilter]);
    if (boardCurricula) return gradeRange(boardCurricula);
    return clean(students.filter(matchSchool).map((s) => normalizeGrade(s.grade))).sort(compareGrades);
  }, [students, schoolFilter, curriculumFilter, boardCurricula]);
  const sectionOptions = useMemo(
    () => clean(students.filter((s) => matchSchool(s) && matchCurriculum(s) && matchGrade(s)).map((s) => (s.section || '').trim())),
    [students, schoolFilter, curriculumFilter, gradeFilter],
  );

  function changeSchool(v: string) { setSchoolFilter(v); setCurriculumFilter('all'); setGradeFilter('all'); setSectionFilter('all'); }
  function changeCurriculum(v: string) { setCurriculumFilter(v); setGradeFilter('all'); setSectionFilter('all'); }
  function changeGrade(v: string) { setGradeFilter(v); setSectionFilter('all'); }

  const filteredStudents = useMemo(() => {
    const list = visibleStudents.filter((s) => matchSchool(s) && matchCurriculum(s) && matchGrade(s) && matchSection(s));
    return filterByText(list, searchQuery, ['name', 'email', 'school', 'grade', 'curriculum', 'section']);
  }, [visibleStudents, schoolFilter, curriculumFilter, gradeFilter, sectionFilter, searchQuery]);

  const activeFilters = [
    schoolFilter !== 'all' ? { key: 'school', label: schoolFilter, clear: () => changeSchool('all') } : null,
    curriculumFilter !== 'all' ? { key: 'curriculum', label: curriculumFilter, clear: () => changeCurriculum('all') } : null,
    gradeFilter !== 'all' ? { key: 'grade', label: gradeFilter, clear: () => changeGrade('all') } : null,
    sectionFilter !== 'all' ? { key: 'section', label: `Section ${sectionFilter}`, clear: () => setSectionFilter('all') } : null,
    onlyUnassigned ? { key: 'status', label: 'Unassigned only', clear: () => setOnlyUnassigned(false) } : null,
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  function clearAllFilters() {
    changeSchool('all'); setOnlyUnassigned(false); setSearchQuery('');
  }

  // "Teacher at the selected student's school" + "subjects that teacher
  // actually teaches" — quick-select chips above the manual fields below,
  // which stay as the always-available fallback (also what the existing
  // tests drive directly). Uses the full `students` list (not the filtered
  // view above) so a selection's school is known even if a later search
  // hides that row.
  const selectedStudents = useMemo(
    () => students.filter((s) => selectedStudentIds.has(s.id)),
    [students, selectedStudentIds],
  );
  const selectedSchools = useMemo(
    () => new Set(selectedStudents.map((s) => s.school).filter(Boolean)),
    [selectedStudents],
  );
  // Narrow the teacher list to the selected students' school, grade and
  // curriculum — each only when the whole selection shares one value. With
  // nothing selected yet, fall back to the Grade/Curriculum filters above.
  const activeSchool = selectedSchools.size === 1 ? [...selectedSchools][0] : null;
  const teachingContext = useMemo<TeachingContext>(() => {
    const only = (xs: string[]) => { const set = new Set(xs.filter(Boolean)); return set.size === 1 ? [...set][0] : null; };
    if (selectedStudents.length === 0) {
      // A filter value wins; otherwise use what every student in the filtered roster shares.
      const pick = (f: string, xs: string[]) => (f !== 'all' ? f : only(xs));
      return {
        school: pick(schoolFilter, filteredStudents.map((s) => s.school)),
        grade: pick(gradeFilter, filteredStudents.map((s) => normalizeGrade(s.grade))),
        curriculum: pick(curriculumFilter, filteredStudents.map((s) => normalizeCurriculum(s.curriculum))),
      };
    }
    return {
      school: activeSchool,
      grade: only(selectedStudents.map((s) => normalizeGrade(s.grade))),
      curriculum: only(selectedStudents.map((s) => normalizeCurriculum(s.curriculum))),
    };
  }, [selectedStudents, activeSchool, schoolFilter, gradeFilter, curriculumFilter, filteredStudents]);

  // Grades in play for the subject catalog when the context has a curriculum but no single grade.
  const contextGrades = useMemo(() => {
    if (teachingContext.grade) return [teachingContext.grade];
    if (!teachingContext.curriculum) return [];
    const pool = selectedStudents.length ? selectedStudents : filteredStudents;
    const seen = [...new Set(pool
      .filter((s) => normalizeCurriculum(s.curriculum) === teachingContext.curriculum)
      .map((s) => normalizeGrade(s.grade))
      .filter(Boolean))];
    return seen.length ? seen : getGradesForCurriculum(teachingContext.curriculum);
  }, [teachingContext, selectedStudents, filteredStudents]);

  const [teacherSearch, setTeacherSearch] = useState('');
  const [showAllTeachers, setShowAllTeachers] = useState(false);
  const matchingTeachers = useMemo(() => teachers.filter((t) => teacherFits(t, teachingContext)), [teachers, teachingContext]);
  const filteredTeachers = useMemo(
    () => filterByText(showAllTeachers ? teachers : matchingTeachers, teacherSearch, ['name', 'email', 'school']),
    [teachers, matchingTeachers, showAllTeachers, teacherSearch],
  );
  // Several accounts share a display name ("Test Teacher") — tell them apart by email.
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    teachers.forEach((t) => counts.set(t.name, (counts.get(t.name) || 0) + 1));
    return new Set([...counts].filter(([, n]) => n > 1).map(([name]) => name));
  }, [teachers]);

  const selectedTeacher = useMemo(() => teachers.find((t) => t.email === teacherEmail) || null, [teachers, teacherEmail]);
  const [manualEmailOpen, setManualEmailOpen] = useState(false);

  // Subjects come from the curriculum + grade catalog onboarding uses (same names
  // teacher profiles are saved with); the selected teacher's own subjects are listed first.
  const taughtSubjects = useMemo(
    () => new Set(selectedTeacher ? subjectsFor(selectedTeacher, teachingContext) : []),
    [selectedTeacher, teachingContext],
  );
  const availableSubjects = useMemo(() => {
    const curriculum = teachingContext.curriculum;
    const catalog = curriculum ? contextGrades.flatMap((g) => getSubjectsForEntry(curriculum, g)) : [];
    const all = [...new Set([...catalog, ...taughtSubjects])];
    return all.sort((a, b) => Number(taughtSubjects.has(b)) - Number(taughtSubjects.has(a)) || a.localeCompare(b));
  }, [teachingContext, contextGrades, taughtSubjects]);

  const subjectsHeading = teachingContext.curriculum
    ? `Subjects for ${teachingContext.curriculum} · ${teachingContext.grade || (contextGrades.length > 1 ? `${contextGrades.length} grades` : contextGrades[0] || 'all grades')}`
    : 'Subjects';

  // Picked subjects that no longer fit after a filter/selection change would be assigned blindly — drop them.
  useEffect(() => {
    if (!subjects.length || !availableSubjects.length) return;
    const kept = subjects.filter((s) => availableSubjects.includes(s));
    if (kept.length !== subjects.length) setSubjectsText(kept.join(', '));
  }, [availableSubjects]);

  const contextLabel = [teachingContext.grade, teachingContext.curriculum, teachingContext.school].filter(Boolean).join(' · ');

  function pickTeacher(t: AdminTeacher) {
    setTeacherEmail(teacherEmail === t.email ? '' : t.email);
    setSubjectsText('');
  }

  function toggleSubjectChip(subject: string) {
    const next = new Set(subjects);
    if (next.has(subject)) next.delete(subject); else next.add(subject);
    setSubjectsText([...next].join(', '));
  }

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
            <View style={styles.summaryStrip}>
              <View style={styles.summaryCell}>
                <View style={[styles.summaryIcon, { backgroundColor: colors.accentBlue + '1F' }]}>
                  <Feather name="users" size={15} color={colors.accentBlue} />
                </View>
                <View>
                  <Text style={styles.summaryLabel}>Total students</Text>
                  <Text style={styles.summaryValue}>{students.length}</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCell}>
                <View style={[styles.summaryIcon, { backgroundColor: colors.accentYellow + '1F' }]}>
                  <Feather name="check-square" size={15} color={colors.accentYellow} />
                </View>
                <View>
                  <Text style={styles.summaryLabel}>Selected</Text>
                  <Text style={styles.summaryValue}>{selectedStudentIds.size}</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCell}>
                <View style={[styles.summaryIcon, { backgroundColor: colors.accentRed + '1F' }]}>
                  <Feather name="user" size={15} color={colors.accentRed} />
                </View>
                <View>
                  <Text style={styles.summaryLabel}>Needs a teacher</Text>
                  <Text style={styles.summaryValue}>{students.filter((s) => s.teacher_student.length === 0).length}</Text>
                </View>
              </View>
            </View>

            <View style={styles.filterRow}>
              <SelectField testID="map-filter-school" label="School" allLabel="All schools" value={schoolFilter} options={schoolOptions} onChange={changeSchool} />
              <SelectField testID="map-filter-curriculum" label="Curriculum" allLabel="All curricula" value={curriculumFilter} options={curriculumOptions} onChange={changeCurriculum} />
              <SelectField testID="map-filter-grade" label="Grade" allLabel="All grades" value={gradeFilter} options={gradeOptions} onChange={changeGrade} />
              <SelectField testID="map-filter-section" label="Section" allLabel="All sections" value={sectionFilter} options={sectionOptions} onChange={setSectionFilter} />
              <SelectField
                testID="map-filter-status"
                label="Status"
                allLabel="All statuses"
                value={onlyUnassigned ? 'Unassigned only' : 'all'}
                options={['Unassigned only']}
                onChange={(v) => setOnlyUnassigned(v === 'Unassigned only')}
              />
            </View>

            {activeFilters.length > 0 && (
              <View style={styles.chipsLine}>
                <View style={styles.activeChips}>
                  {activeFilters.map((f) => (
                    <View key={f.key} style={styles.activeChip}>
                      <Text style={styles.activeChipText}>{f.label}</Text>
                      <TouchableOpacity testID={`map-filter-clear-${f.key}`} onPress={f.clear} accessibilityLabel={`Remove ${f.label} filter`}>
                        <Feather name="x" size={12} color={colors.textDim} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity testID="map-filter-clear-all" onPress={clearAllFilters}>
                    <Text style={styles.clearAllText}>Clear all</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Feather name="search" size={14} color={colors.textDim} />
                <TextInput
                  testID="map-student-search"
                  style={styles.searchInput}
                  placeholder="Search by name, email, school…"
                  placeholderTextColor={colors.textDim}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <Text style={[styles.resultCount, { marginLeft: 'auto' as any }]}>{filteredStudents.length} students</Text>
            </View>

            {selectedStudentIds.size > 0 && (
              <View style={styles.selectionBar}>
                <Text style={styles.selectionBarText}>{selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? 's' : ''} selected</Text>
                <TouchableOpacity onPress={() => selectedStudents.forEach((s) => toggleStudent(s.id))}>
                  <Text style={styles.selectionBarClear}>Clear selection</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.table}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.tableHeading}>Students ({filteredStudents.length})</Text>
                <Text style={styles.cardSubtitle}>Select one or more students to assign below.</Text>
              </View>
              <StudentRosterTable students={filteredStudents} selectedIds={selectedStudentIds} onToggle={toggleStudent} styles={styles} colors={colors} />
            </View>

            <View style={styles.assignCard}>
              <View style={styles.assignHeader}>
                <Text style={styles.assignTitle}>Assign selected students</Text>
                <View style={styles.countBadge}>
                  <Feather name="users" size={12} color={colors.accentYellow} />
                  <Text style={styles.countBadgeText}>
                    {selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? 's' : ''} selected
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardSubtitle, { marginBottom: 16 }]}>Choose a teacher, then the subjects to assign.</Text>

              <View style={styles.assignColumns}>
                {/* Step 1 — teacher */}
                <View style={[styles.stepPanel, styles.assignColTeacher]}>
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepNum, styles.stepNumActive]}><Text style={styles.stepNumTextActive}>1</Text></View>
                    <Text style={styles.stepTitle}>Select teacher</Text>
                    <Text style={styles.stepMeta}>
                      {showAllTeachers || !contextLabel
                        ? `Showing all ${teachers.length} teachers`
                        : `${matchingTeachers.length} matching ${contextLabel}`}
                    </Text>
                  </View>

                  <View style={styles.teacherSearchRow}>
                    <View style={[styles.searchBox, { flex: 1, maxWidth: undefined }]}>
                      <Feather name="search" size={14} color={colors.textDim} />
                      <TextInput
                        testID="map-teacher-search"
                        style={styles.searchInput}
                        placeholder="Search teacher by name or email…"
                        placeholderTextColor={colors.textDim}
                        value={teacherSearch}
                        onChangeText={setTeacherSearch}
                      />
                    </View>
                    <TouchableOpacity
                      testID="map-teacher-show-all"
                      style={[styles.switchRow, !contextLabel && { opacity: 0.45 }]}
                      disabled={!contextLabel}
                      onPress={() => setShowAllTeachers((v) => !v)}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: !!contextLabel && !showAllTeachers }}
                    >
                      <View style={[styles.switchTrack, !!contextLabel && !showAllTeachers && styles.switchTrackOn]}>
                        <View style={[styles.switchKnob, !!contextLabel && !showAllTeachers && styles.switchKnobOn]} />
                      </View>
                      <Text style={styles.switchLabel}>Show matching only</Text>
                    </TouchableOpacity>
                  </View>

                  {filteredTeachers.length === 0 ? (
                    <Text style={styles.emptyRowText}>
                      {teacherSearch ? 'No teachers match this search.' : 'No teachers set up for this school / curriculum / grade yet — turn off "Show matching only".'}
                    </Text>
                  ) : (
                    <ScrollView style={[styles.teacherList, filteredTeachers.length > 6 && styles.teacherListScroll]} nestedScrollEnabled>
                      {filteredTeachers.map((t) => {
                        const picked = teacherEmail === t.email;
                        const n = subjectsFor(t, teachingContext).length;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            testID={`map-teacher-chip-${t.id}`}
                            style={[styles.teacherRow, picked && styles.teacherRowActive]}
                            onPress={() => pickTeacher(t)}
                            activeOpacity={0.75}
                          >
                            <View style={[styles.radio, picked && styles.radioActive]}>{picked && <View style={styles.radioDot} />}</View>
                            <View style={styles.teacherAvatar}><Text style={styles.teacherAvatarText}>{initialsOf(t.name)}</Text></View>
                            <View style={{ flex: 2, minWidth: 0 }}>
                              <Text style={styles.rosterName} numberOfLines={1}>{t.name}</Text>
                              <Text style={styles.rosterEmail} numberOfLines={1}>{t.email}</Text>
                            </View>
                            <Text style={styles.teacherSchool} numberOfLines={1}>{t.school || '—'}</Text>
                            <Text style={styles.teacherTeaches} numberOfLines={1}>
                              {n ? `${n} subject${n !== 1 ? 's' : ''} set` : 'No subjects set'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  <TouchableOpacity testID="map-teacher-manual-toggle" onPress={() => setManualEmailOpen((v) => !v)} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                    <Text style={styles.clearAllText}>{manualEmailOpen ? 'Hide manual entry' : 'Teacher not listed? Enter email'}</Text>
                  </TouchableOpacity>
                  {manualEmailOpen && (
                    <TextInput
                      testID="map-teacher-email"
                      style={[styles.input, { marginTop: 8 }]}
                      value={teacherEmail}
                      onChangeText={setTeacherEmail}
                      placeholder="teacher@school.edu"
                      placeholderTextColor={colors.textDim}
                      autoCapitalize="none"
                    />
                  )}
                </View>

                {/* Step 2 — subjects + summary + action */}
                <View style={[styles.stepPanel, styles.assignColSubjects]}>
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepNum, teacherEmail ? styles.stepNumActive : null]}>
                      <Text style={teacherEmail ? styles.stepNumTextActive : styles.stepNumText}>2</Text>
                    </View>
                    <Text style={styles.stepTitle}>Choose subjects</Text>
                  </View>

                  <View style={styles.selectedTeacherHead}>
                    <Text style={styles.subLabel}>Selected teacher</Text>
                    {!!teacherEmail && (
                      <TouchableOpacity testID="map-teacher-change" onPress={() => { setTeacherEmail(''); setSubjectsText(''); }}>
                        <Text style={styles.changeLink}>Change</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={[styles.selectedTeacherCard, !!teacherEmail && styles.selectedTeacherCardOn]}>
                    <View style={styles.teacherAvatar}>
                      {teacherEmail
                        ? <Text style={styles.teacherAvatarText}>{initialsOf(selectedTeacher?.name || teacherEmail)}</Text>
                        : <Feather name="user" size={14} color={colors.textDim} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rosterName} numberOfLines={1}>{selectedTeacher?.name || teacherEmail || 'No teacher selected'}</Text>
                      <Text style={styles.rosterEmail} numberOfLines={1}>
                        {selectedTeacher
                          ? [selectedTeacher.email, selectedTeacher.school].filter(Boolean).join(' · ')
                          : teacherEmail ? 'Entered manually' : 'Pick a teacher from the list'}
                      </Text>
                    </View>
                    {!!selectedTeacher && (
                      <Text style={styles.teacherTeaches}>
                        {taughtSubjects.size ? `${taughtSubjects.size} subject${taughtSubjects.size !== 1 ? 's' : ''} set` : 'No subjects set'}
                      </Text>
                    )}
                  </View>

                  <View style={[styles.selectedTeacherHead, { marginTop: 16 }]}>
                    <Text style={styles.subLabel}>
                      {subjectsHeading}
                    </Text>
                    <Text style={styles.stepMeta}>Select one or more</Text>
                  </View>
                  {availableSubjects.length === 0 ? (
                    <Text style={styles.hint}>Pick a Curriculum above (or select students from one curriculum) to see its subjects.</Text>
                  ) : (
                    <>
                      <View style={styles.chipRow}>
                        {availableSubjects.map((subj) => {
                          const on = subjects.includes(subj);
                          return (
                            <TouchableOpacity
                              key={subj}
                              testID={`map-subject-chip-${subj}`}
                              style={[styles.subjectChip, on && styles.subjectChipOn]}
                              onPress={() => toggleSubjectChip(subj)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.subjectCheck, on && styles.subjectCheckOn]}>
                                {on && <Feather name="check" size={10} color="#fff" />}
                              </View>
                              <Text style={[styles.subjectChipText, on && styles.subjectChipTextOn]}>
                                {taughtSubjects.has(subj) ? '★ ' : ''}{subj}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {taughtSubjects.size > 0 && <Text style={styles.hint}>★ = {selectedTeacher?.name} already teaches this</Text>}
                    </>
                  )}

                  <View style={styles.summaryBox}>
                    <View style={styles.summaryBoxHead}>
                      <Feather name="clipboard" size={14} color={colors.textMain} />
                      <Text style={styles.summaryBoxTitle}>Assignment summary</Text>
                    </View>
                    <View style={styles.summaryLine}>
                      <Text style={styles.summaryKey}>Students to assign</Text>
                      <Text style={styles.summaryVal}>{selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={styles.summaryLine}>
                      <Text style={styles.summaryKey}>Selected teacher</Text>
                      <Text style={styles.summaryVal} numberOfLines={1}>{selectedTeacher?.name || teacherEmail || '—'}</Text>
                    </View>
                    <View style={[styles.summaryLine, { borderBottomWidth: 0, alignItems: 'flex-start' }]}>
                      <Text style={styles.summaryKey}>Selected subjects</Text>
                      <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                        <Text style={styles.summaryVal}>{subjects.length ? `${subjects.length} subject${subjects.length !== 1 ? 's' : ''}` : 'General'}</Text>
                        {subjects.length > 0 && (
                          <View style={[styles.chipRow, { justifyContent: 'flex-end', marginTop: 6 }]}>
                            {subjects.map((s) => (
                              <View key={s} style={styles.miniChip}><Text style={styles.miniChipText}>{s}</Text></View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {!!assignError && (
                    <View style={[styles.errorBanner, { marginTop: 14 }]} testID="map-assign-error">
                      <Feather name="alert-circle" size={14} color={colors.accentRed} />
                      <Text style={styles.errorText}>{assignError}</Text>
                    </View>
                  )}
                  {!!assignedCount && !assignError && (
                    <View style={[styles.successBanner, { marginTop: 14 }]} testID="map-assign-success">
                      <Feather name="check-circle" size={14} color={colors.accentCyan} />
                      <Text style={styles.successText}>Assigned {assignedCount} student{assignedCount !== 1 ? 's' : ''}.</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    testID="map-assign-submit"
                    style={[styles.submitBtn, { alignSelf: 'stretch', marginTop: 14 }, (!teacherEmail || !selectedStudentIds.size) && { opacity: 0.55 }]}
                    onPress={assign}
                    disabled={assigning}
                    activeOpacity={0.85}
                  >
                    {assigning ? <ActivityIndicator color="#0B0B0B" size="small" /> : (
                      <>
                        <Feather name="user-check" size={15} color="#0B0B0B" />
                        <Text style={styles.submitBtnText}>
                          {selectedStudentIds.size ? `Assign to ${selectedStudentIds.size} student${selectedStudentIds.size !== 1 ? 's' : ''}` : 'Assign'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.infoNote}>
                    <Feather name="info" size={13} color={colors.accentBlue} />
                    <Text style={styles.infoNoteText}>If no subject is selected, the students will be assigned as “General” only.</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}
