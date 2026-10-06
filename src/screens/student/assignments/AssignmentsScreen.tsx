import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useSlowLoadMessage } from '../../../hooks/useSlowLoadMessage';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';

import { makeStyles } from './styles';
import { FILTERS } from './constants';
import { useAssignments } from './hooks/useAssignments';
import { AssignmentCard } from './components/AssignmentCard';
import { QuizModal } from './components/QuizModal';
import { ScaffoldedModal } from './components/ScaffoldedModal';
import { SubmissionModal } from './components/SubmissionModal';
import { InteractiveQuizModal } from './components/InteractiveQuizModal';
import { SubmittedResultModal } from './components/SubmittedResultModal';
import { CompletedResultModal } from './components/CompletedResultModal';

export default function AssignmentsScreen({ navigation, route }: any) {
  const highlightId = route?.params?.highlightId;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    activeFilter, setActiveFilter,
    assignments, loading, loadError, setLoading, load,
    activeAssignment, setActiveAssignment,
    quizProgress, setQuizProgress,
    submittingQuiz, setSubmittingQuiz,
    openingAssignmentId,
    viewingResult, setViewingResult,
    submittedResult, setSubmittedResult,
    expandedExplain, setExpandedExplain,
    filtered, pending, completed, overdue,
    handleSubmitted, openAssignment,
    studentId,
  } = useAssignments(highlightId, navigation);

  const slowLoad = useSlowLoadMessage(loading);

  if (loading) {
    return (
      <ScreenLayout>
        <View testID="assignments-loading" style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={colors.accentYellow} />
          {slowLoad && (
            <Text style={{ marginTop: 14, fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24 }}>
              Still waking up the server — this can take up to a minute on the first load.
            </Text>
          )}
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Assignments"
          subtitle="Your tasks and upcoming deadlines"
          searchPlaceholder="Search assignments..."
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Pending',   value: pending,   color: colors.accentYellow, icon: 'clock' as const },
              { label: 'Completed', value: completed, color: colors.accentGreen,  icon: 'check-circle' as const },
              { label: 'Ready',     value: overdue,   color: colors.accentYellow,   icon: 'zap' as const },
            ].map((s) => (
              <View key={s.label} testID={`assignments-stat-${s.label.toLowerCase()}`} style={[styles.statCard, { borderTopWidth: 2, borderTopColor: s.color }]}>
                <View>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text testID={`assignments-stat-${s.label.toLowerCase()}-value`} style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: s.color + '18', borderColor: s.color + '33' }]}>
                  <Feather name={s.icon} size={20} color={s.color} />
                </View>
              </View>
            ))}
          </View>

          {/* Filter Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                testID={`assignments-filter-${f.toLowerCase()}`}
                style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Assignment list */}
          {loadError && assignments.length === 0 ? (
            <View testID="assignments-error-state" style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
              <Feather name="alert-triangle" size={36} color={colors.accentRed} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted, fontWeight: '400', textAlign: 'center' }]}>
                Couldn&apos;t load your assignments. Check your connection and try again.
              </Text>
              <TouchableOpacity
                testID="assignments-retry-button"
                onPress={() => { setLoading(true); load(); }}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.accentYellow }}
              >
                <Feather name="refresh-cw" size={14} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View testID="assignments-empty-state" style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Feather name="check-square" size={36} color={colors.textDim} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 12, fontWeight: '400' }]}>
                {activeFilter === 'Completed' ? 'No completed assignments yet.' : 'No assignments yet. Your teacher will assign work soon.'}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {activeFilter === 'All' ? 'All Assignments' : activeFilter === 'Completed' ? 'Completed' : activeFilter === 'Quizzes' ? 'Quizzes' : 'Pending Tasks'}
                </Text>
                <Text style={styles.sectionSub}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {filtered.map((item) => (
                  <AssignmentCard
                    key={item.id}
                    item={item}
                    colors={colors}
                    styles={styles}
                    openingAssignmentId={openingAssignmentId}
                    onOpen={openAssignment}
                    onViewResult={setViewingResult}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* ── Active assignment: interactive quiz, quiz, scaffolded, or submission ── */}
        {activeAssignment && activeAssignment.interactiveQuizHtml && activeAssignment.status !== 'completed' ? (
          <InteractiveQuizModal
            assignment={activeAssignment}
            studentId={studentId}
            quizProgress={quizProgress}
            setQuizProgress={setQuizProgress}
            submittingQuiz={submittingQuiz}
            setSubmittingQuiz={setSubmittingQuiz}
            onClose={() => setActiveAssignment(null)}
            onSubmitted={handleSubmitted}
          />
        ) : activeAssignment && (activeAssignment.quizQuestions?.length ?? 0) > 0 ? (
          <QuizModal
            assignment={activeAssignment}
            colors={colors}
            onClose={() => setActiveAssignment(null)}
            onSubmitted={(updated) => { handleSubmitted(updated); setActiveAssignment(null); setSubmittedResult({ assignment: activeAssignment!, data: updated }); }}
          />
        ) : activeAssignment && (activeAssignment.taskSteps?.length ?? 0) > 0 ? (
          <ScaffoldedModal
            assignment={activeAssignment}
            colors={colors}
            onClose={() => setActiveAssignment(null)}
            onSubmitted={(updated) => { handleSubmitted(updated); setActiveAssignment(null); setSubmittedResult({ assignment: activeAssignment!, data: updated }); }}
          />
        ) : activeAssignment ? (
          <SubmissionModal
            assignment={activeAssignment}
            colors={colors}
            onClose={() => setActiveAssignment(null)}
            onSubmitted={(updated) => { handleSubmitted(updated); setActiveAssignment(null); setSubmittedResult({ assignment: activeAssignment!, data: updated }); }}
          />
        ) : null}

        {submittedResult && (
          <SubmittedResultModal
            assignment={submittedResult.assignment}
            data={submittedResult.data}
            colors={colors}
            onClose={() => setSubmittedResult(null)}
          />
        )}

        {viewingResult && (
          <CompletedResultModal
            assignment={viewingResult}
            colors={colors}
            expandedExplain={expandedExplain}
            setExpandedExplain={setExpandedExplain}
            onClose={() => { setViewingResult(null); setExpandedExplain({}); }}
          />
        )}
      </View>
    </ScreenLayout>
  );
}
