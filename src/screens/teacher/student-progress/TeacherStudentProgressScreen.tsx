import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';
import { useStudentProgress } from './hooks/useStudentProgress';
import { useStudentRoster } from './hooks/useStudentRoster';
import HeatmapGrid from './components/HeatmapGrid';
import HeatmapLegend from './components/HeatmapLegend';
import TopFilters from './components/TopFilters';
import SummaryCards from './components/SummaryCards';
import ActivityTable from './components/ActivityTable';
import AttemptDrawer from './components/AttemptDrawer';
import { filterByClass } from './utils/rosterFilters';
import { computeSubjectSummary } from './utils/subjectSummary';
import { exportStudentProgressPdf } from './utils/exportPdf';
import { updatedAgoLabel } from './utils/formatters';
import type { HeatmapStudent } from './types';

export default function TeacherStudentProgressScreen({ navigation }: any) {
  const { colors } = useTheme();
  const gold = colors.accentYellow;
  const { user } = useAuth();
  const {
    students, topics, summaryStudents, summaryTopics,
    loading, refreshing, error, lastRefreshedAt,
    filters, setFilters,
    availableSubjects, availableGrades, availableCurricula, availableSections,
    refresh,
  } = useStudentProgress(user?.email);
  const { students: roster, loading: rosterLoading } = useStudentRoster(user?.email);

  // Section 7/8/10 — Activity & Performance's own Today/Overall toggle,
  // deliberately scoped to that section only (NOT a top-level page filter).
  const [activityMode, setActivityMode] = useState<'today' | 'overall'>('overall');

  // One shared filter state (Subject/Grade/Class/Section) drives Subject
  // Progress, Topic Exploration, AND the Activity table below — never
  // independent per-section state, so the three sections can't disagree.
  const filteredRoster = filterByClass(roster, filters);
  const subjectCards = computeSubjectSummary(summaryStudents, summaryTopics);

  const [selectedCell, setSelectedCell] = useState<{ student: HeatmapStudent; topic: string } | null>(null);

  function handleExportPdf() {
    exportStudentProgressPdf({
      teacherName: user?.name || user?.email || 'Teacher',
      filters,
      subjectCards,
      heatmapStudents: students,
      heatmapTopics: topics,
      activityStudents: filteredRoster,
      activityMode,
    });
  }

  return (
    <ScreenLayout>
      <View style={{ flex: 1, backgroundColor: colors.bgDark }}>
        <Header
          title="Student Progress"
          subtitle="Real mastery data per student, per topic"
          onMenuPress={() => navigation.openDrawer()}
        />

        {/* Section 2 — header action row: refresh timestamp, Refresh, Export
            PDF. Kept as its own bar below the shared Header component
            (rather than modifying Header.tsx, which is used across every
            screen) to avoid unrelated risk to other pages. */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingTop: 10 }}>
          <Text style={{ fontSize: 11, color: colors.textDim }}>{updatedAgoLabel(lastRefreshedAt)}</Text>
          <TouchableOpacity testID="student-progress-refresh" onPress={refresh} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: colors.borderColor }}>
            <Feather name="refresh-cw" size={12} color={colors.textMuted} />
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.textMuted }}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="student-progress-export-pdf" onPress={handleExportPdf} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: gold }}>
            <Feather name="download" size={12} color={gold} />
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: gold }}>Export PDF</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={gold} />}
        >
          {/* Section 3 — top filters: Subject / Grade / Class / Section only.
              No Time Period filter here — that lives inside Activity &
              Performance as its own Today/Overall toggle (Section 7). */}
          <TopFilters
            colors={colors}
            gold={gold}
            subjectOptions={availableSubjects}
            selectedSubject={filters.subject}
            onSelectSubject={(subject) => setFilters((f) => ({ ...f, subject }))}
            gradeOptions={availableGrades}
            selectedGrade={filters.grade}
            onSelectGrade={(grade) => setFilters((f) => ({ ...f, grade }))}
            classOptions={availableCurricula}
            selectedClass={filters.curriculum}
            onSelectClass={(curriculum) => setFilters((f) => ({ ...f, curriculum }))}
            sectionOptions={availableSections}
            selectedSection={filters.section}
            onSelectSection={(section) => setFilters((f) => ({ ...f, section }))}
          />

          {/* Section 4 — Subject Progress, derived from the SAME filtered
              data as Topic Exploration below (see utils/subjectSummary.ts),
              so it can never disagree with what the teacher filtered to. */}
          <SummaryCards colors={colors} gold={gold} subjects={subjectCards} loading={loading} />

          {/* Section 5 — Topic Exploration */}
          <View style={{ backgroundColor: colors.cardDark, borderRadius: 12, borderWidth: 1, borderColor: colors.borderColor, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain }}>Topic exploration</Text>
                <Text style={{ fontSize: 10.5, color: colors.textDim }}>See exactly where each student is progressing or getting stuck</Text>
              </View>
              <HeatmapLegend colors={colors} />
            </View>

            {loading ? (
              <ActivityIndicator color={gold} style={{ marginTop: 20 }} />
            ) : error ? (
              <View style={{ padding: 24, alignItems: 'center', gap: 10 }}>
                <Feather name="wifi-off" size={22} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>Could not load student progress.</Text>
                <TouchableOpacity testID="student-progress-retry" onPress={refresh} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: gold }}>
                  <Text style={{ color: gold, fontWeight: '700', fontSize: 13 }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <HeatmapGrid
                colors={colors}
                students={students}
                topics={topics}
                onCellPress={(student, topic) => setSelectedCell({ student, topic })}
              />
            )}
          </View>

          {/* Section 7/8/9 — Activity & Performance, with its own
              Today/Overall toggle. */}
          <ActivityTable colors={colors} gold={gold} students={filteredRoster} loading={rosterLoading} mode={activityMode} onModeChange={setActivityMode} />
        </ScrollView>

        {/* Section 6 — lightweight drill-down drawer */}
        {selectedCell && (
          <AttemptDrawer
            colors={colors}
            studentId={selectedCell.student.id}
            studentName={selectedCell.student.name}
            topic={selectedCell.topic}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </View>
    </ScreenLayout>
  );
}
