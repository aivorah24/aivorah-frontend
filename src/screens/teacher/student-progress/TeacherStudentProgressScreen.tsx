import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';
import { useStudentProgress } from './hooks/useStudentProgress';
import { useSubjectSummary } from './hooks/useSubjectSummary';
import { useStudentRoster } from './hooks/useStudentRoster';
import { useTeacherClasses } from './hooks/useTeacherClasses';
import HeatmapGrid from './components/HeatmapGrid';
import HeatmapLegend from './components/HeatmapLegend';
import ClassSelector from './components/ClassSelector';
import SummaryCards from './components/SummaryCards';
import ActivityTable from './components/ActivityTable';
import AttemptDrawer from './components/AttemptDrawer';
import { filterByClass } from './utils/rosterFilters';
import type { HeatmapStudent } from './types';

export default function TeacherStudentProgressScreen({ navigation }: any) {
  const { colors } = useTheme();
  const gold = colors.accentYellow;
  const { user } = useAuth();
  const { classes, loading: classesLoading } = useTeacherClasses(user?.email);
  const {
    students, topics, loading, refreshing, error,
    filters, setFilters, availableSections, refresh,
  } = useStudentProgress(user?.email);
  const { subjects: subjectSummaries, combined, loading: summaryLoading } = useSubjectSummary(user?.email);
  const { students: roster, loading: rosterLoading } = useStudentRoster(user?.email);

  // No generic class combo exists until the teacher's real teaches[] loads —
  // default to their first real (grade, curriculum) combo, never "All".
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const selectedClass = classes[selectedClassIndex];

  // Keep filters.grade/curriculum/subject in sync with the selected class —
  // adjusted during render (React's "adjusting state when a prop changes"
  // pattern) rather than an effect, matching useTeacherCurriculumGrade.ts.
  const [syncedClassIndex, setSyncedClassIndex] = useState(-1);
  if (selectedClass && syncedClassIndex !== selectedClassIndex) {
    setSyncedClassIndex(selectedClassIndex);
    setFilters({ grade: selectedClass.grade, curriculum: selectedClass.curriculum, subject: selectedClass.subjects[0] });
  }

  // Reported feedback: the Activity table ignored the filters entirely —
  // one shared set of controls (grade+curriculum+subject+section) now scopes
  // both the heatmap and this table, applied client-side since the roster
  // endpoint has no filter query params at all.
  const filteredRoster = filterByClass(roster, filters);

  const [selectedCell, setSelectedCell] = useState<{ student: HeatmapStudent; topic: string } | null>(null);

  return (
    <ScreenLayout>
      <View style={{ flex: 1, backgroundColor: colors.bgDark }}>
        <Header
          title="Student Progress"
          subtitle="Real mastery data per student, per topic"
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={gold} />}
        >
          {/* Page-level class selector — top-right, per the reported
              feedback ("keep the filter on top right side"). Defaults to
              the teacher's real taught grade+curriculum+subject (no generic
              "All"); section stays a separate "All sections" default since
              it isn't part of the teacher's own class assignment. Scopes
              BOTH the heatmap and the Activity table below it. */}
          {!classesLoading && classes.length === 0 ? null : (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <ClassSelector
                colors={colors}
                gold={gold}
                classes={classes}
                selectedClassIndex={selectedClassIndex}
                onSelectClass={setSelectedClassIndex}
                subjectOptions={selectedClass?.subjects ?? []}
                selectedSubject={filters.subject}
                onSelectSubject={(subject) => setFilters((f) => ({ ...f, subject }))}
                sectionOptions={availableSections}
                selectedSection={filters.section}
                onSelectSection={(section) => setFilters((f) => ({ ...f, section }))}
              />
            </View>
          )}

          {/* Section B — Where the class stands, by subject */}
          <SummaryCards colors={colors} gold={gold} subjects={subjectSummaries} combined={combined} loading={summaryLoading} />

          {/* Section C — Topic exploration heatmap */}
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

          {/* Section D — Activity & Performance table */}
          <ActivityTable colors={colors} gold={gold} students={filteredRoster} loading={rosterLoading} />
        </ScrollView>

        {/* Section E — drill-down drawer */}
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
