/**
 * School Admin — Student Administration (V1 write access).
 *
 * Ported from the approved Claude Design prototype ("Aivorah Student
 * Administration.dc.html") but re-themed to Aivorah's own system per explicit
 * instruction: Inter (fonts.serif), existing color tokens, existing card/
 * table conventions from SchoolAdminPeopleScreen — not the prototype's
 * Sora/Source Serif fonts or oklch palette.
 *
 * school_admin is an operational manager (confirmed 2026-07-12), so this
 * screen is real write access, not a read-only oversight view: add a
 * student, change status, bulk status change — all scoped server-side to
 * the admin's own school (GET/POST/PATCH aivorah-school-admin-service
 * /school-admin/students*).
 *
 * Also mounted as SchoolAdminArchivedStudents (school-admin/students/archived)
 * — its own route/URL, not a params-only shortcut into this one, so the
 * sidebar highlight, browser URL, and a hard refresh all stay correct. The
 * component tells the two apart via `route.name` (isArchivedRoute below);
 * see Sidebar.tsx / DrawerContent.tsx for the matching nav-item split.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, TextInput, Pressable, Platform, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { schoolAdminStudentsService, type StudentRow, type StudentDetail, type StudentEditPatch } from './services/schoolAdminStudentsService';
import { statusTint, formatLastActive } from './utils/studentFormatters';
import { FilterDropdown } from './components/FilterDropdown';
import { StatusPill } from './components/StatusPill';
import { StudentDetailDrawer } from './components/StudentDetailDrawer';
import { StudentsToolbar } from './components/StudentsToolbar';
import { StudentsBulkActionBar } from './components/StudentsBulkActionBar';
import { STATUS_LABEL } from './constants';
import { promoteGradeChoices, gradeNum, ALL_GRADE_CHIPS } from './utils/promoteGradeChoices';
import { useStudentsListState, getGradesForCurriculum, type StatusFilter, type SortKey } from './hooks/useStudentsListState';

export default function SchoolAdminStudentsScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();

  // SchoolAdminArchivedStudents is its own route/URL (school-admin/students/archived),
  // not a filter applied to the regular Students screen — the route is the
  // source of truth for "archived mode", not runtime params, so a hard
  // refresh on that URL still lands here showing only archived students.
  const isArchivedRoute = route?.name === 'SchoolAdminArchivedStudents';

  const {
    items, total, loading, setLoading, refreshing, setRefreshing, error, setError,
    query, setQuery,
    statusFilter, setStatusFilter,
    curriculumFilter, setCurriculumFilter,
    gradeFilter, setGradeFilter,
    sectionFilter, setSectionFilter,
    sortKey, sortAsc, toggleSort,
    facetGrades, facetSections, facetCurriculums,
    statusOptions, gradeOptions, sectionOptions, curriculumOptions,
    load, loadFacets,
  } = useStudentsListState(
    user?.email,
    isArchivedRoute,
    isArchivedRoute ? 'archived' : ((route?.params?.initialStatus as StatusFilter) || 'all')
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [promoteOpen, setPromoteOpen] = useState(false);

  useFocusEffect(useCallback(() => { load(); loadFacets(); }, [load, loadFacets]));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => prev.size === items.length ? new Set() : new Set(items.map((i) => i.id)));
  }

  async function applyBulkStatus(status: 'active' | 'inactive' | 'archived') {
    if (!user?.email || selected.size === 0) return;
    try {
      await schoolAdminStudentsService.bulkUpdateStatus(Array.from(selected), status, user.email);
      setSelected(new Set());
      load();
    } catch { setError('Failed to update selected students.'); }
  }

  // "Promote Students" — moves the selected students' Grade (and optionally
  // Section) in one write, mirroring applyBulkStatus's fire-and-refresh
  // pattern exactly. Only grade/section change server-side; id, email,
  // admission number, and every other table (assignments, attendance,
  // reports, stats) are untouched — see POST /students/bulk-grade.
  // Returns an error string on failure, or null on success, so the dialog can
  // stay open and show the message instead of silently closing.
  async function applyPromote(targetGrade: string, targetSection: string, studentIds?: string[]): Promise<string | null> {
    const ids = studentIds && studentIds.length > 0 ? studentIds : Array.from(selected);
    if (!user?.email || ids.length === 0) return 'Select at least one student.';
    try {
      await schoolAdminStudentsService.bulkPromote(ids, targetGrade, targetSection, user.email);
      setSelected(new Set());
      await Promise.all([load(), loadFacets()]); // list + filter options must reflect the new grade/curriculum
      setPromoteOpen(false);
      return null;
    } catch (err: any) {
      return err.message || 'Failed to promote. Check your connection.';
    }
  }

  async function openDetail(id: string) {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await schoolAdminStudentsService.getStudentDetail(id, user!.email);
      setDetail(data);
    } catch { /* Error handling could go here */ }
    finally { setDetailLoading(false); }
  }

  async function changeDetailStatus(status: 'active' | 'inactive' | 'archived') {
    if (!detail || !user?.email) return;
    try {
      await schoolAdminStudentsService.updateStudentStatus(detail.id, status, user.email);
      setDetailId(null);
      setDetail(null);
      load();
    } catch { /* Error handling could go here */ }
  }

  // Returns an error string on failure, or null on success — lets the drawer
  // keep its edit form open and show the message inline instead of closing.
  async function saveDetailEdits(patch: StudentEditPatch): Promise<string | null> {
    if (!detail || !user?.email) return 'Not ready';
    try {
      await schoolAdminStudentsService.updateStudent(detail.id, patch, user.email);
      await openDetail(detail.id); // refetch so the drawer shows the saved values
      load();                       // refresh the list row too
      return null;
    } catch (err: any) {
      return err.message || 'Failed to save. Check your connection.';
    }
  }

  async function deleteDetailStudent(): Promise<string | null> {
    if (!detail || !user?.email) return 'Not ready';
    try {
      await schoolAdminStudentsService.deleteStudent(detail.id, user.email);
      setDetailId(null);
      setDetail(null);
      load();
      return null;
    } catch (err: any) {
      return err.message || 'Failed to delete. Check your connection.';
    }
  }

  function renderSortHeader(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <Pressable
        style={({ hovered }: any) => [styles.th, Platform.OS === 'web' && hovered && styles.thHovered]}
        onPress={() => toggleSort(key)}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${label}`}
      >
        <Text style={[styles.thText, active && styles.thTextActive]}>{label}</Text>
        {active && <Feather name={sortAsc ? 'arrow-up' : 'arrow-down'} size={11} color={colors.accentYellow} />}
      </Pressable>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title={isArchivedRoute ? 'Archived Students' : 'Students'}
          subtitle={isArchivedRoute
            ? `${total} archived student${total === 1 ? '' : 's'}`
            : facetGrades.length > 0
              ? `${total} student${total === 1 ? '' : 's'} across ${facetGrades.length} grade${facetGrades.length === 1 ? '' : 's'}`
              : `${total} student${total === 1 ? '' : 's'} in your school`}
          onMenuPress={() => navigation?.openDrawer?.()}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accentYellow} />}
        >
          <StudentsToolbar
            query={query}
            onQueryChange={setQuery}
            onImport={() => navigation?.navigate?.('SchoolAdminBulkImport')}
            onAddStudent={() => navigation.navigate('SchoolAdminAddStudent')}
            colors={colors}
          />

          <View style={styles.filterRow}>
            {curriculumOptions.length > 1 && (
              <FilterDropdown label="All curricula" value={curriculumFilter} onChange={setCurriculumFilter} options={curriculumOptions} colors={colors} />
            )}
            <FilterDropdown label="All grades" value={gradeFilter} onChange={setGradeFilter} options={gradeOptions} colors={colors} />
            <FilterDropdown label="All sections" value={sectionFilter} onChange={setSectionFilter} options={sectionOptions} colors={colors} />
            {/* Status is fixed to "archived" on this route (see isArchivedRoute) —
                no dropdown to switch away from it, so the URL never drifts
                out of sync with what's on screen. */}
            {!isArchivedRoute && (
              <FilterDropdown label="All statuses" value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} options={statusOptions} colors={colors} />
            )}
            <Text style={styles.resultsCount}>{total} result{total === 1 ? '' : 's'}</Text>
          </View>

          {selected.size === 0 && !isArchivedRoute && items.length > 0 && (
            <Text style={styles.promoteHint}>
              To promote students to the next grade, select them below, then tap Promote Students.
            </Text>
          )}

          {selected.size > 0 && (
            <StudentsBulkActionBar
              count={selected.size}
              colors={colors}
              onPromote={() => setPromoteOpen(true)}
              onMarkActive={() => applyBulkStatus('active')}
              onMarkInactive={() => applyBulkStatus('inactive')}
              onArchive={() => applyBulkStatus('archived')}
              onClear={() => setSelected(new Set())}
            />
          )}

          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.emptyBox}>
              <Feather name="alert-circle" size={28} color={colors.textDim} />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={styles.retryBtn} accessibilityRole="button">
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="users" size={28} color={colors.textDim} />
              <Text style={styles.emptyText}>
                {total === 0
                  ? (isArchivedRoute ? 'No archived students.' : 'No students yet. Add your first student to get started.')
                  : 'No students match your filters.'}
              </Text>
            </View>
          ) : isMobile ? (
            items.map((s) => {
              const tint = statusTint(colors, s.status);
              return (
                <TouchableOpacity key={s.id} style={styles.card} onPress={() => openDetail(s.id)} activeOpacity={0.7}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{(s.name || '?').slice(0, 2).toUpperCase()}</Text></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {[s.grade, s.section, s.admissionNumber].filter(Boolean).join('  ·  ') || '—'}
                    </Text>
                  </View>
                  <StatusPill label={STATUS_LABEL[s.status]} tint={tint} />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.table}>
              <View style={styles.theadRow}>
                <View style={styles.thCheckCol}>
                  <Pressable onPress={toggleSelectAll} style={styles.checkbox} accessibilityRole="checkbox" accessibilityLabel="Select all students">
                    <Feather name={selected.size === items.length ? 'check-square' : 'square'} size={15} color={selected.size === items.length ? colors.accentYellow : colors.textDim} />
                  </Pressable>
                </View>
                <View style={styles.thNameCol}>{renderSortHeader('Student', 'name')}</View>
                <View style={styles.thAdmCol}>{renderSortHeader('Admission No', 'admissionNumber')}</View>
                <View style={styles.thGradeCol}>{renderSortHeader('Grade · Section', 'grade')}</View>
                <View style={styles.thStatusCol}><Text style={[styles.thText, styles.thStatic]}>Status</Text></View>
                <View style={styles.thJoinedCol}><Text style={[styles.thText, styles.thStatic]}>Last Active</Text></View>
              </View>
              {items.map((s, i) => {
                const tint = statusTint(colors, s.status);
                const isSel = selected.has(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => openDetail(s.id)}
                    style={({ hovered }: any) => [
                      styles.tr, i === items.length - 1 && styles.trLast,
                      Platform.OS === 'web' && hovered && { backgroundColor: colors.cardHover },
                      isSel && { backgroundColor: `${colors.accentYellow}0D` },
                    ]}
                  >
                    <View style={styles.thCheckCol}>
                      <Pressable
                        onPress={(e: any) => { e.stopPropagation?.(); toggleSelect(s.id); }}
                        style={styles.checkbox}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Select ${s.name}`}
                      >
                        <Feather name={isSel ? 'check-square' : 'square'} size={15} color={isSel ? colors.accentYellow : colors.textDim} />
                      </Pressable>
                    </View>
                    <View style={styles.thNameCol}>
                      <View style={styles.nameCell}>
                        <View style={styles.avatar}><Text style={styles.avatarText}>{(s.name || '?').slice(0, 2).toUpperCase()}</Text></View>
                        <View style={{ minWidth: 0, flexShrink: 1 }}>
                          <Text style={styles.tdName} numberOfLines={1}>{s.name || '—'}</Text>
                          <Text style={styles.tdEmail} numberOfLines={1}>{s.email}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.thAdmCol}>
                      <Text style={styles.td} numberOfLines={1}>{s.admissionNumber || '—'}</Text>
                    </View>
                    <View style={styles.thGradeCol}>
                      <Text style={styles.td} numberOfLines={1}>{[s.grade, s.section].filter(Boolean).join(' · ') || '—'}</Text>
                    </View>
                    <View style={styles.thStatusCol}>
                      <StatusPill label={STATUS_LABEL[s.status]} tint={tint} style={{ alignSelf: 'flex-start' }} />
                    </View>
                    <View style={styles.thJoinedCol}>
                      <Text style={styles.td} numberOfLines={1}>{formatLastActive(s.lastActiveAt)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      <StudentDetailDrawer
        visible={!!detailId}
        loading={detailLoading}
        detail={detail}
        colors={colors}
        onClose={() => { setDetailId(null); setDetail(null); }}
        onChangeStatus={changeDetailStatus}
        onSave={saveDetailEdits}
        onDelete={deleteDetailStudent}
      />

      <PromoteDialog
        visible={promoteOpen}
        allStudents={items}
        preselectedIds={Array.from(selected)}
        facetGrades={facetGrades}
        facetSections={facetSections}
        colors={colors}
        onClose={() => setPromoteOpen(false)}
        onConfirm={applyPromote}
      />
    </ScreenLayout>
  );
}

// ── Promote Students (bulk grade/section move) ──────────────────────────────
const IB_PROGRAMS = ['IB PYP', 'IB MYP', 'IB DP'];
function PromoteDialog({ visible, allStudents, preselectedIds, facetGrades, facetSections, colors, onClose, onConfirm }: {
  visible: boolean; allStudents: StudentRow[]; preselectedIds: string[];
  facetGrades: string[]; facetSections: string[]; colors: AppColors;
  onClose: () => void; onConfirm: (targetGrade: string, targetSection: string, studentIds: string[]) => Promise<string | null>;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [targetGrade, setTargetGrade] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [targetProgram, setTargetProgram] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form each time the modal opens
    if (visible) { setTargetGrade(''); setTargetSection(''); setTargetProgram(''); setErr(''); }
  }, [visible]);

  const selectedStudents = useMemo(() => allStudents.filter((s) => preselectedIds.includes(s.id)), [allStudents, preselectedIds]);
  const selectedCount = selectedStudents.length;

  const currentGrades = useMemo(() => Array.from(new Set(selectedStudents.map((s) => s.grade).filter(Boolean) as string[])), [selectedStudents]);
  const currentSummary = currentGrades.length === 0 ? 'an unset grade'
    : currentGrades.length === 1 ? currentGrades[0]
    : `multiple grades (${currentGrades.join(', ')})`;

  const maxCurrentGradeNum = useMemo(() => {
    const nums = currentGrades.map(gradeNum).filter((n): n is number => n !== null);
    return nums.length ? Math.max(...nums) : null;
  }, [currentGrades]);

  const isIBSelection = useMemo(
    () => selectedStudents.some((s) => (s.curriculum || '').toUpperCase().startsWith('IB')),
    [selectedStudents]
  );

  const gradeChoices = useMemo(() => promoteGradeChoices(
    facetGrades,
    maxCurrentGradeNum,
    isIBSelection ? (targetProgram ? getGradesForCurriculum(targetProgram) || [] : ALL_GRADE_CHIPS) : undefined,
  ), [isIBSelection, targetProgram, facetGrades, maxCurrentGradeNum]);

  async function handleConfirm() {
    if (!targetGrade.trim()) { setErr('Pick a target grade.'); return; }
    setErr('');
    setSubmitting(true);
    const error = await onConfirm(targetGrade.trim(), targetSection, preselectedIds);
    setSubmitting(false);
    if (error) setErr(error);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.drawerCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Promote Students</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={18} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          <Text style={styles.formHint}>
            Currently: {currentGrades.length > 0 ? currentGrades.join(', ') : '—'}
            {' '}({selectedCount} student{selectedCount === 1 ? '' : 's'} selected)
          </Text>

          {isIBSelection && (
            <>
              <Text style={styles.formLabel}>Target programme</Text>
              <View style={styles.chipRow}>
                {IB_PROGRAMS.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.chip, targetProgram === p && styles.chipActive]}
                    onPress={() => { setTargetProgram(targetProgram === p ? '' : p); setTargetGrade(''); }}
                  >
                    <Text style={[styles.chipText, targetProgram === p && styles.chipTextActive]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={styles.formLabel}>Target grade *</Text>
          {gradeChoices.length > 0 ? (
            <View style={styles.chipRow}>
              {gradeChoices.map((g) => (
                <Pressable key={g} style={[styles.chip, targetGrade === g && styles.chipActive]} onPress={() => setTargetGrade(g)}>
                  <Text style={[styles.chipText, targetGrade === g && styles.chipTextActive]}>{g}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.formHint}>No higher grade available for this selection.</Text>
          )}

          <Text style={styles.formLabel}>Target section (optional)</Text>
          {facetSections.length > 0 ? (
            <View style={styles.chipRow}>
              {facetSections.map((s) => (
                <Pressable key={s} style={[styles.chip, targetSection === s && styles.chipActive]} onPress={() => setTargetSection(targetSection === s ? '' : s)}>
                  <Text style={[styles.chipText, targetSection === s && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <TextInput
              style={styles.formInput}
              value={targetSection}
              onChangeText={setTargetSection}
              placeholder="Leave blank to keep each student's current section"
              placeholderTextColor={colors.textDim}
            />
          )}

          <Text style={styles.formHint}>
            You are promoting {selectedCount} student{selectedCount === 1 ? '' : 's'} from {currentSummary} to{' '}
            {targetGrade.trim() || '—'}{targetSection.trim() ? ` (Section ${targetSection.trim()})` : ''}.
            {'\n'}Only Grade/Section change — student IDs, login, and all learning history/reports are preserved.
          </Text>

          {!!err && <Text style={styles.formError}>{err}</Text>}

          <View style={styles.formFooter}>
            <TouchableOpacity style={styles.formCancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.formCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.formSubmitBtn} onPress={handleConfirm} disabled={submitting || !targetGrade.trim() || selectedCount === 0}>
              {submitting ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={styles.formSubmitText}>Promote {selectedCount} student{selectedCount === 1 ? '' : 's'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%' },
    filterRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg, flexWrap: 'wrap', alignItems: 'center', zIndex: 10, position: 'relative' },
    resultsCount: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textDim, marginLeft: 'auto' },
    promoteHint: { fontFamily: fonts.serif, fontSize: 12, color: colors.textDim, marginBottom: spacing.sm, fontStyle: 'italic' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    chip: { borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
    chipActive: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
    chipText: { fontFamily: fonts.serif, fontSize: 11.5, fontWeight: '600', color: colors.textMuted },
    chipTextActive: { color: '#0B0B0B', fontWeight: '700' },

    table: { backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, overflow: 'hidden', zIndex: 1, position: 'relative' },
    theadRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor, backgroundColor: colors.cardHover, paddingVertical: 4 },
    th: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.sm },
    thHovered: { backgroundColor: colors.cardDark },
    thText: { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: colors.textDim },
    thTextActive: { color: colors.textHeading },
    thStatic: { paddingVertical: 10, paddingHorizontal: 12 },
    thCheckCol: { width: 40, alignItems: 'center' },
    thNameCol: { flex: 3, minWidth: 200 },
    thAdmCol: { flex: 1.2, minWidth: 90 },
    thGradeCol: { flex: 1.3, minWidth: 110 },
    thStatusCol: { flex: 1, minWidth: 90 },
    thJoinedCol: { flex: 1.5, minWidth: 120 },
    tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingVertical: 8 },
    trLast: { borderBottomWidth: 0 },
    checkbox: { padding: 4 },
    nameCell: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
    td: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted, paddingHorizontal: 12 },
    tdName: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: colors.textHeading, flexShrink: 1 },
    tdEmail: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim, marginTop: 1 },

    card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 6 },
    cardName: { fontFamily: fonts.serif, fontSize: 13.5, fontWeight: '700', color: colors.textHeading },
    cardMeta: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textMuted, marginTop: 1 },

    avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: `${colors.primary}22` },
    avatarText: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '700', color: colors.primary },

    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 10, paddingHorizontal: 24 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor },
    retryText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    formCard: { backgroundColor: colors.cardDark, borderRadius: 20, borderWidth: 1, borderColor: colors.borderColor, padding: 24, width: '100%', maxWidth: 460 },
    drawerCard: { backgroundColor: colors.cardDark, borderRadius: 20, borderWidth: 1, borderColor: colors.borderColor, padding: 24, width: '100%', maxWidth: 420 },
    formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    formTitle: { fontFamily: fonts.serif, fontSize: 18, fontWeight: '700', color: colors.textHeading, flexShrink: 1 },
    formLabel: { fontFamily: fonts.serif, fontSize: 11.5, fontWeight: '600', color: colors.textMuted, marginBottom: 5, marginTop: 8 },
    formInput: {
      fontFamily: fonts.serif, fontSize: 13, color: colors.textMain,
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm,
      paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.bgDark,
    },
    formHint: { fontFamily: fonts.serif, fontSize: 11, color: colors.textDim, marginTop: 6, lineHeight: 16 },
    formError: { fontFamily: fonts.serif, fontSize: 12, color: colors.accentRed, marginTop: 12 },
    formFooter: { flexDirection: 'row', gap: 10, marginTop: 18 },
    formCancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    formCancelText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.textMuted },
    formSubmitBtn: { flex: 1, backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    formSubmitText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },

    credCard: { backgroundColor: colors.cardDark, borderRadius: 20, borderWidth: 1, borderColor: colors.borderColor, padding: 26, width: '100%', maxWidth: 380, alignItems: 'center', gap: 4 },
    credIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    credTitle: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '700', color: colors.textHeading },
    credSub: { fontFamily: fonts.serif, fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17, marginBottom: 12 },
    credRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    credLabel: { fontFamily: fonts.serif, fontSize: 12, color: colors.textDim },
    credValue: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.textHeading },
    credDoneBtn: { marginTop: 16, backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 28 },
    credDoneText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },
  });
}
