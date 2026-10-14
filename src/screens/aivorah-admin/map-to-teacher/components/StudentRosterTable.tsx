import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusPill } from '../../../school-admin/students/components/StatusPill';
import { sortRows, toggleSort, type SortState } from '../../shared/tableControls';
import { normalizeGrade, normalizeCurriculum } from '../utils/teacherMatch';
import type { AdminStudent } from '../types';

const PAGE_SIZE = 10;
const AVATAR_TINTS = ['#8B5CF6', '#0EA5E9', '#14B8A6', '#EC4899', '#F97316', '#22C55E'];

type Row = AdminStudent & { gradeLabel: string };

// One column spec for header AND body, so every cell in a column gets the
// same width regardless of its content (long school names used to push the
// following columns right, out of line with their headers).
const COLUMNS: { key: string; label: string; flex: number; sortKey?: keyof Row; align?: 'center' }[] = [
  { key: 'student', label: 'Student', flex: 2.4, sortKey: 'name' },
  { key: 'grade', label: 'Grade', flex: 1, sortKey: 'gradeLabel' },
  { key: 'curriculum', label: 'Curriculum', flex: 1, sortKey: 'curriculum' },
  { key: 'school', label: 'School', flex: 1.5, sortKey: 'school' },
  { key: 'teachers', label: 'Teachers & subjects', flex: 1.8 },
  { key: 'status', label: 'Status', flex: 1, align: 'center' },
];
const col = (key: string) => COLUMNS.find((c) => c.key === key)!;

function initials(name: string): string {
  const words = (name || '?').trim().split(/\s+/);
  return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
}

// Stable per-student colour so the avatar doesn't change between renders/pages.
function avatarTint(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length];
}

// One entry per teacher with every subject they're assigned for this student.
function teacherSubjectGroups(s: AdminStudent): { key: string; name: string; subjects: string[] }[] {
  const byTeacher = new Map<string, { key: string; name: string; subjects: string[] }>();
  s.teacher_student.forEach((ts) => {
    const key = ts.teacher?.id || ts.teacher_id;
    const g = byTeacher.get(key) || { key, name: ts.teacher?.name || ts.teacher?.email || 'Unknown teacher', subjects: [] };
    const subj = ts.subject || 'General';
    if (!g.subjects.includes(subj)) g.subjects.push(subj);
    byTeacher.set(key, g);
  });
  return [...byTeacher.values()];
}

function Cell({ column, styles, children }: { column: (typeof COLUMNS)[number]; styles: any; children: React.ReactNode }) {
  return (
    <View style={[styles.rosterCell, { flex: column.flex }, column.align === 'center' && { alignItems: 'center' }]}>
      {children}
    </View>
  );
}

// Placeholder for an empty cell — centred in its column, not left-hanging.
function Dash({ styles }: { styles: any }) {
  return <Text style={[styles.rosterCellText, styles.rosterDash]}>—</Text>;
}

function Checkbox({ checked, partial, styles }: { checked: boolean; partial?: boolean; styles: any }) {
  const on = checked || partial;
  return (
    <View
      style={[styles.checkbox, { marginRight: 0 }, on && styles.checkboxChecked]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: partial && !checked ? 'mixed' : checked }}
    >
      {checked ? <Feather name="check" size={12} color="#FFFFFF" />
        : partial ? <Feather name="minus" size={12} color="#FFFFFF" /> : null}
    </View>
  );
}

export function StudentRosterTable({ students, selectedIds, onToggle, styles, colors }: {
  students: AdminStudent[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  styles: any;
  colors: any;
}) {
  const [sort, setSort] = useState<SortState<Row>>({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(0);

  const rows = useMemo(
    () => sortRows(students.map((s) => ({ ...s, gradeLabel: normalizeGrade(s.grade) })), sort),
    [students, sort],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // A new filter/search can shrink the list below the current page.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp after the list shrinks
  useEffect(() => { if (page > pageCount - 1) setPage(0); }, [page, pageCount]);
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((s) => selectedIds.has(s.id));
  function togglePage() {
    pageRows.filter((s) => selectedIds.has(s.id) === allOnPageSelected).forEach((s) => onToggle(s.id));
  }

  function HeaderCell({ column }: { column: (typeof COLUMNS)[number] }) {
    const k = column.sortKey;
    if (!k) return <Cell column={column} styles={styles}><Text style={styles.rosterHeadText}>{column.label}</Text></Cell>;
    const active = sort.key === k;
    return (
      <Cell column={column} styles={styles}>
        <TouchableOpacity testID={`map-sort-${String(k)}`} style={styles.rosterSortBtn} onPress={() => setSort((s) => toggleSort(s, k))}>
          <Text style={styles.rosterHeadText}>{column.label}</Text>
          {active
            ? <Feather name={sort.dir === 'asc' ? 'arrow-up' : 'arrow-down'} size={11} color={colors.accentYellow} />
            : <MaterialCommunityIcons name="swap-vertical" size={13} color={colors.textDim} />}
        </TouchableOpacity>
      </Cell>
    );
  }

  const first = rows.length ? page * PAGE_SIZE + 1 : 0;
  const last = Math.min(rows.length, (page + 1) * PAGE_SIZE);

  return (
    <View style={styles.roster}>
      <View style={styles.rosterHeadRow}>
        <TouchableOpacity testID="map-select-page" style={styles.rosterCheckCell} onPress={togglePage} accessibilityLabel="Select all on this page">
          <Checkbox checked={allOnPageSelected} partial={!allOnPageSelected && pageRows.some((s) => selectedIds.has(s.id))} styles={styles} />
        </TouchableOpacity>
        {COLUMNS.map((c) => <HeaderCell key={c.key} column={c} />)}
      </View>

      {pageRows.length === 0 ? (
        <Text style={styles.emptyRowText}>No students match this filter.</Text>
      ) : pageRows.map((s, i) => {
        const selected = selectedIds.has(s.id);
        const tint = avatarTint(s.id);
        const assigned = s.teacher_student.length > 0;
        return (
          <TouchableOpacity
            key={s.id}
            testID={`map-student-row-${s.id}`}
            style={[styles.rosterRow, i % 2 === 1 && styles.rosterRowAlt, selected && styles.tableRowSelected]}
            onPress={() => onToggle(s.id)}
            activeOpacity={0.8}
          >
            <View style={styles.rosterCheckCell}><Checkbox checked={selected} styles={styles} /></View>
            <Cell column={col('student')} styles={styles}>
              <View style={styles.rosterStudentCell}>
                <View style={[styles.rosterAvatar, { backgroundColor: tint + '26' }]}>
                  <Text style={[styles.rosterAvatarText, { color: tint }]}>{initials(s.name)}</Text>
                </View>
                <View style={{ flexShrink: 1, minWidth: 0 }}>
                  <Text style={styles.rosterName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.rosterEmail} numberOfLines={1}>{s.email}</Text>
                </View>
              </View>
            </Cell>
            <Cell column={col('grade')} styles={styles}>
              {s.gradeLabel ? <Text style={styles.rosterCellText} numberOfLines={1}>{s.gradeLabel}{s.section ? ` · ${s.section}` : ''}</Text> : <Dash styles={styles} />}
            </Cell>
            <Cell column={col('curriculum')} styles={styles}>
              {normalizeCurriculum(s.curriculum) ? <Text style={styles.rosterCellText} numberOfLines={1}>{normalizeCurriculum(s.curriculum)}</Text> : <Dash styles={styles} />}
            </Cell>
            <Cell column={col('school')} styles={styles}>
              {s.school ? <Text style={styles.rosterCellText} numberOfLines={2}>{s.school}</Text> : <Dash styles={styles} />}
            </Cell>
            <Cell column={col('teachers')} styles={styles}>
              <View style={{ gap: 4 }}>
                {assigned ? teacherSubjectGroups(s).map((g) => (
                  <View key={g.key} style={styles.assignedTeacherLine} testID={`map-row-teacher-${s.id}-${g.key}`}>
                    <Text style={styles.rosterTeacherText} numberOfLines={1}>{g.name}</Text>
                    <View style={styles.assignedSubjects}>
                      {g.subjects.map((subj) => (
                        <View key={subj} style={styles.assignedSubjectPill}><Text style={styles.assignedSubjectText}>{subj}</Text></View>
                      ))}
                    </View>
                  </View>
                )) : <Dash styles={styles} />}
              </View>
            </Cell>
            <Cell column={col('status')} styles={styles}>
              <StatusPill label={assigned ? 'Assigned' : 'Unassigned'} tint={assigned ? '#2F9E44' : '#DC2626'} />
            </Cell>
          </TouchableOpacity>
        );
      })}

      <View style={styles.rosterFooter}>
        <Text style={styles.resultCount}>{selectedIds.size} selected</Text>
        <View style={styles.rosterPager}>
          <Text style={styles.resultCount}>{first}–{last} of {rows.length}</Text>
          <TouchableOpacity testID="map-page-prev" style={[styles.pagerBtn, page === 0 && { opacity: 0.4 }]} disabled={page === 0} onPress={() => setPage((p) => p - 1)}>
            <Feather name="chevron-left" size={16} color={colors.textMain} />
          </TouchableOpacity>
          <TouchableOpacity testID="map-page-next" style={[styles.pagerBtn, page >= pageCount - 1 && { opacity: 0.4 }]} disabled={page >= pageCount - 1} onPress={() => setPage((p) => p + 1)}>
            <Feather name="chevron-right" size={16} color={colors.textMain} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
