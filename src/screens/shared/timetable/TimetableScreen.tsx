/**
 * TimetableScreen — standalone weekly timetable for a class the user can access.
 * Class selector (from /classes/mine), the shared grid, the slot popup, a
 * setup action for template owners, and a web PDF/print export.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Platform, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { DAY_LABELS, TimetableClass } from './services/timetableApi';
import { useTimetableState } from './hooks/useTimetableState';
import TimetableGrid from './components/TimetableGrid';
import SlotDetailModal from './components/SlotDetailModal';
import PeriodEditorModal from './components/PeriodEditorModal';
import ImportTimetableModal from './components/ImportTimetableModal';

export default function TimetableScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();

  // When opened for a specific class (e.g. from ClassDetail), show just that
  // class and hide the selector. Otherwise list the user's own classes.
  const pGrade: string | undefined = route?.params?.grade;
  const pSection: string = route?.params?.section || '';
  const pLabel: string | undefined = route?.params?.label;
  // Memoised on the primitive params: a new object each render re-runs the load effects forever.
  const paramClass = useMemo<TimetableClass | null>(() => (pGrade
    ? { grade: pGrade, section: pSection, label: pLabel || `${pGrade}${pSection ? ' ' + pSection : ''}` }
    : null), [pGrade, pSection, pLabel]);

  const {
    classes, selected, setSelected, tt, loading, error, modal, setModal, showPeriods, setShowPeriods,
    saving, downloading, refreshing, setRefreshing, isAdmin, structure,
    classLabel, programmes, activeProgramme, gradesForSelector, sectionsForGrade,
    loadClasses, loadTimetable, setupDefault, onSaveSlot, onSavePeriods, onClearSlot, downloadPdf,
    pickGrade, pickSection, pickProgramme,
  } = useTimetableState({ role: user?.role, school: user?.school, userName: user?.name, paramClass });

  // Classes this user may replace from a PDF: every class for admins, homeroom classes for teachers.
  const [showImport, setShowImport] = useState(false);
  const importTargets = useMemo<TimetableClass[]>(() => (isAdmin
    ? structure.flatMap((g) => (g.sections.length ? g.sections : ['']).map((sec) => ({ grade: g.name, section: sec, label: `${g.name}${sec ? ' ' + sec : ''}` })))
    : classes.filter((c) => c.homeroom)), [isAdmin, structure, classes]);

  // Reload classes list and the current timetable every time the screen gains
  // focus — this ensures that a save by a teacher/admin in another session is
  // picked up immediately when any user navigates back here, without requiring
  // them to switch classes or hard-reload the page.
  useFocusEffect(useCallback(() => {
    loadClasses();
    if (selected) loadTimetable(selected);
  }, [loadClasses, loadTimetable, selected]));
  // Also re-fetch the timetable whenever the selected class changes (covers
  // the initial load and when the user taps a different class chip).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on class-selection change, external sync
  useEffect(() => { if (selected) loadTimetable(selected); }, [selected, loadTimetable]);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Timetable" subtitle="Weekly class schedule" onMenuPress={() => navigation?.openDrawer?.()} />

        {/* Class selector + actions */}
        <View style={styles.toolbar}>
          {isAdmin && structure.length > 0 ? (
            // Admin: Programme (IB only) → Grade → Section hierarchy.
            <View style={{ flex: 1, gap: 8 }}>
              {programmes.length > 0 && (
                <View style={styles.selectorRow}>
                  <Text style={styles.selectorLabel}>Programme</Text>
                  {programmes.map((p) => (
                    <TouchableOpacity key={p} style={[styles.chip, activeProgramme === p && styles.chipActive]} onPress={() => pickProgramme(p)} accessibilityRole="button">
                      <Text style={[styles.chipText, activeProgramme === p && styles.chipTextActive]}>IB {p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.selectorRow}>
                <Text style={styles.selectorLabel}>Grade</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {gradesForSelector.map((g) => (
                    <TouchableOpacity key={g.name} style={[styles.chip, selected?.grade === g.name && styles.chipActive]} onPress={() => pickGrade(g.name)} accessibilityRole="button">
                      <Text style={[styles.chipText, selected?.grade === g.name && styles.chipTextActive]}>{g.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {sectionsForGrade.length > 0 && (
                <View style={styles.selectorRow}>
                  <Text style={styles.selectorLabel}>Section</Text>
                  {sectionsForGrade.map((s) => (
                    <TouchableOpacity key={s} style={[styles.chip, selected?.section === s && styles.chipActive]} onPress={() => pickSection(s)} accessibilityRole="button">
                      <Text style={[styles.chipText, selected?.section === s && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
              {classes.map((c) => {
                const active = selected && c.grade === selected.grade && c.section === selected.section;
                return (
                  <TouchableOpacity key={c.label} style={[styles.classPill, active && styles.classPillActive]} onPress={() => setSelected(c)} accessibilityRole="button">
                    <Text style={[styles.classPillText, active && styles.classPillTextActive]} numberOfLines={1}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          {Platform.OS === 'web' && importTargets.length > 0 && (
            <TouchableOpacity style={styles.downloadBtn} onPress={() => setShowImport(true)} accessibilityRole="button">
              <Feather name="file-plus" size={14} color={colors.textHeading} />
              <Text style={styles.downloadText}>Import PDF</Text>
            </TouchableOpacity>
          )}
          {tt?.permissions.canManageTemplate && tt.periodDefs.length > 0 && (
            <TouchableOpacity style={styles.downloadBtn} onPress={() => setShowPeriods(true)} accessibilityRole="button">
              <Feather name="clock" size={14} color={colors.textHeading} />
              <Text style={styles.downloadText}>Periods</Text>
            </TouchableOpacity>
          )}
          {Platform.OS === 'web' && tt && tt.periodDefs.length > 0 && (
            <TouchableOpacity style={styles.downloadBtn} onPress={downloadPdf} disabled={downloading} accessibilityRole="button">
              {downloading ? (
                <ActivityIndicator size="small" color={colors.textHeading} />
              ) : (
                <Feather name="download" size={14} color={colors.textHeading} />
              )}
              <Text style={styles.downloadText}>{downloading ? 'Processing...' : 'Download'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                if (!selected) return;
                setRefreshing(true);
                await loadTimetable(selected).catch(() => {});
                setRefreshing(false);
              }}
              tintColor={colors.accentYellow}
              colors={[colors.accentYellow]}
            />
          }
        >
          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.centerBox}><Feather name="alert-circle" size={26} color={colors.textDim} /><Text style={styles.centerText}>{error}</Text></View>
          ) : !selected ? (
            <View style={styles.centerBox}><Feather name="calendar" size={26} color={colors.textDim} /><Text style={styles.centerText}>No class to show a timetable for.</Text></View>
          ) : tt && tt.periodDefs.length === 0 && tt.permissions.canManageTemplate ? (
            <View style={styles.centerBox}>
              <Feather name="clock" size={26} color={colors.textDim} />
              <Text style={styles.centerTitle}>Set up the bell schedule</Text>
              <Text style={styles.centerText}>Start with a standard period grid — you can edit each slot afterwards.</Text>
              <TouchableOpacity style={styles.setupBtn} onPress={setupDefault} disabled={saving} accessibilityRole="button">
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.setupText}>Create default periods</Text>}
              </TouchableOpacity>
            </View>
          ) : tt ? (
            <TimetableGrid
              timetable={tt}
              classLabel={classLabel}
              onCellPress={(day, period, slot) => {
                // Read-only viewers still open the popup (detail view); editors get Edit.
                setModal({ day, period, slot });
              }}
            />
          ) : null}
        </ScrollView>

        <SlotDetailModal
          visible={!!modal}
          onClose={() => setModal(null)}
          classLabel={classLabel}
          dayLabel={modal ? (DAY_LABELS[modal.day] || modal.day) : ''}
          period={modal?.period || null}
          slot={modal?.slot || null}
          canEdit={!!tt?.permissions.canEditSlot}
          saving={saving}
          onSave={onSaveSlot}
          onClear={onClearSlot}
        />

        <ImportTimetableModal
          visible={showImport}
          onClose={() => setShowImport(false)}
          targets={importTargets}
          onSaved={() => { if (selected) loadTimetable(selected); }}
        />
        <PeriodEditorModal
          visible={showPeriods}
          onClose={() => setShowPeriods(false)}
          initial={tt?.periodDefs || []}
          saving={saving}
          onSave={onSavePeriods}
        />
      </View>
    </ScreenLayout>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bgDark },
    toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderColor: c.borderColor },
    selectorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    selectorLabel: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '800', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.5, width: 74 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark },
    chipActive: { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '18' },
    chipText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', color: c.textMuted },
    chipTextActive: { color: c.accentYellow, fontWeight: '800' },
    classPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark },
    classPillActive: { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '18' },
    classPillText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600', color: c.textMuted, maxWidth: 160 },
    classPillTextActive: { color: c.accentYellow, fontWeight: '800' },
    downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
    downloadText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: c.textHeading },
    content: { padding: spacing.lg, paddingBottom: 60 },
    centerBox: { alignItems: 'center', paddingTop: 48, gap: 10, maxWidth: 420, alignSelf: 'center' },
    centerTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800', color: c.textHeading },
    centerText: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, textAlign: 'center' },
    setupBtn: { backgroundColor: c.accentYellow, borderRadius: radius.sm, paddingHorizontal: 18, paddingVertical: 12, marginTop: 6 },
    setupText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '800', color: '#fff' },
  });
}
