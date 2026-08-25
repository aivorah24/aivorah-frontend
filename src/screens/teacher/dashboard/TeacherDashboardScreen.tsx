import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, Modal } from 'react-native';
import { spacing, radius } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

import { useTeacherDashboardData } from './hooks/useTeacherDashboardData';
import { buildDashboardStats } from './utils/buildDashboardStats';
import { getGreeting } from './utils/dashboardHelpers';
import AISuggestedActionCard from './components/AISuggestedActionCard';
import StudentOverviewCard from './components/StudentOverviewCard';
import ClassProgressCard from './components/ClassProgressCard';
import InsightsColumns from './components/InsightsColumns';
import { renderLearningPathModal } from './components/modals/LearningPathModals';
import { renderAssignmentModal } from './components/modals/AssignmentModals';
import { renderChallengeModal } from './components/modals/ChallengeModals';

// ─────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────
export default function TeacherDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const gold = colors.accentYellow;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { students, loading, refreshing, setRefreshing, insights, activityFeed, fetchStudents } =
    useTeacherDashboardData(user?.email);

  const firstName = user?.name?.split(' ')[0] || 'Teacher';
  const ringTrack = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const stats = useMemo(
    () => buildDashboardStats(students, insights, activityFeed, gold),
    [students, insights, activityFeed, gold]
  );

  const {
    totalStudents, allNeedsAttention, activeToday, avgProgress,
    medianCombinedMins, minCombinedMins, maxCombinedMins,
    totalAssignmentsAssigned, totalAssignmentsSubmitted, assignSubmitPct,
    totalChallengesAssigned, totalChallengesCompleted, challCompletePct, classProgressPct,
    totalStudyMins, assignStats, challStats,
    studentsWithSubmissions, classAvgScore, studentsCompletedChallenge, studentsWithChallenges,
    learningPathTiles, assignmentTiles, challengeTiles, aiInsightTiles,
    recentStudents, aiActionTitle, aiActionBody,
  } = stats;

  // ── Insight detail modal ───────────────────────────────
  const [insightModal, setInsightModal] = useState<null | { tileIndex: number }>(null);

  function renderInsightModalContent(tileIndex: number) {
    const tile = aiInsightTiles[tileIndex];
    if (!tile) return null;
    const ctx = {
      tile, students, allNeedsAttention, assignStats, challStats,
      classAvgScore, studentsWithSubmissions, studentsWithChallenges, studentsCompletedChallenge,
      totalStudyMins, styles, colors, onClose: () => setInsightModal(null),
    };
    if (tileIndex <= 3) return renderLearningPathModal(tileIndex, ctx);
    if (tileIndex <= 6) return renderAssignmentModal(tileIndex, ctx);
    return renderChallengeModal(tileIndex, ctx);
  }

  if (loading) {
    return (
      <ScreenLayout>
        <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={colors.accentYellow} size="large" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title={`${getGreeting()}, ${firstName}`}
          subtitle={`Your Class · ${totalStudents} Student${totalStudents !== 1 ? 's' : ''}`}
          searchPlaceholder="Search students, assignments..."
          onMenuPress={() => navigation.openDrawer()}
          notificationCount={allNeedsAttention.length || undefined}
        />

        <ScrollView
          testID="dashboard-scroll"
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStudents(); }} tintColor={colors.accentYellow} />}
        >
          <AISuggestedActionCard
            gold={gold}
            title={aiActionTitle}
            body={aiActionBody}
            hasNeedsAttention={allNeedsAttention.length > 0}
            avgProgress={avgProgress}
            styles={styles}
            navigation={navigation}
          />

          {/* ── ROW 1: Student Overview + Class Progress ─── */}
          <View style={[styles.row, { marginBottom: spacing.xl }]}>
            <StudentOverviewCard
              colors={colors}
              gold={gold}
              totalStudents={totalStudents}
              activeToday={activeToday}
              needsAttentionCount={allNeedsAttention.length}
              recentStudents={recentStudents}
              styles={styles}
              navigation={navigation}
            />

            <ClassProgressCard
              colors={colors}
              gold={gold}
              ringTrack={ringTrack}
              totalStudents={totalStudents}
              classProgressPct={classProgressPct}
              medianCombinedMins={medianCombinedMins}
              minCombinedMins={minCombinedMins}
              maxCombinedMins={maxCombinedMins}
              avgProgress={avgProgress}
              totalAssignmentsSubmitted={totalAssignmentsSubmitted}
              totalAssignmentsAssigned={totalAssignmentsAssigned}
              assignSubmitPct={assignSubmitPct}
              totalChallengesCompleted={totalChallengesCompleted}
              totalChallengesAssigned={totalChallengesAssigned}
              challCompletePct={challCompletePct}
              styles={styles}
            />
          </View>

          <InsightsColumns
            gold={gold}
            learningPathTiles={learningPathTiles}
            assignmentTiles={assignmentTiles}
            challengeTiles={challengeTiles}
            onTilePress={(tileIndex) => setInsightModal({ tileIndex })}
            styles={styles}
          />

          {/* Recent Activity has been moved to the Student Overview card */}

        </ScrollView>
      </View>

      {/* ── Insight Detail Modal ───────────────────────── */}
      <Modal testID="insight-modal" visible={!!insightModal} transparent animationType="fade" onRequestClose={() => setInsightModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, [1, 4, 6].includes(insightModal?.tileIndex as number) && { maxWidth: 720 }]}>
            {insightModal && renderInsightModalContent(insightModal.tileIndex)}
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
export const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 48 },

  aiCard: {
    backgroundColor: c.accentYellow,
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    gap: spacing.lg,
  },
  aiTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, zIndex: 1 },
  aiIconWrap: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  aiTag: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.9, marginBottom: 4 },
  aiTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 5, letterSpacing: -0.2 },
  aiSub: { fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 19 },
  aiBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg, paddingVertical: 11,
    borderRadius: radius.md, zIndex: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4,
  },
  aiBtnText: { fontSize: 13, fontWeight: '700', color: c.accentYellow },

  row: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
  card: {
    backgroundColor: c.cardDark, borderWidth: 1,
    borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.lg,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: spacing.md },
  cardTitle: { fontSize: 13, fontWeight: '700', color: c.textMain, flex: 1 },
  cardSub: { fontSize: 11, color: c.textDim, marginBottom: spacing.md, fontWeight: '500' },

  bigNumber: { fontSize: 36, fontWeight: '900', color: c.textMain, letterSpacing: -1.5 },
  changeText: { fontSize: 11, fontWeight: '600', marginTop: 2, marginBottom: 2 },
  overviewLabel: { fontSize: 11, color: c.textDim, marginBottom: spacing.md },
  overviewDivider: { height: 1, backgroundColor: c.borderColor, marginBottom: spacing.md },
  overviewRow: { flexDirection: 'row' },
  overviewStat: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  overviewVal: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  overviewKey: { fontSize: 10, color: c.textDim, textAlign: 'center', marginTop: 2 },

  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  donutWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  donutPct: { fontSize: 14, fontWeight: '800', letterSpacing: -0.5 },
  donutStats: { flex: 1 },
  donutStatVal: { fontSize: 15, fontWeight: '800', color: c.textMain },
  donutStatLabel: { fontSize: 10, color: c.textDim, marginTop: 1 },

  // 3 progress bars (Learning Path, Assignments, Challenges)
  progressBars: { gap: spacing.sm },
  progressItem: { gap: 3 },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  progressLabel: { flex: 1, fontSize: 10, fontWeight: '600', color: c.textMuted },
  progressPct: { fontSize: 11, fontWeight: '800' },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressTimeLabel: { fontSize: 9, fontWeight: '600', color: c.textDim },

  insightRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md, alignItems: 'flex-start' },
  insightBorder: { borderBottomWidth: 1, borderBottomColor: c.borderColor },
  insightIcon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  insightTitle: { fontSize: 12, fontWeight: '700', color: c.textMain, marginBottom: 3 },
  insightBody: { fontSize: 11, color: c.textMuted, lineHeight: 16 },

  // AI Teaching Insights — Aivorah Enchanting Forest card
  insightsCard: {
    backgroundColor: c.cardDark,
    borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, overflow: 'hidden',
  },
  insightsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs,
  },
  insightsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  insightsIconWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: c.accentYellow + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  insightsTitle: { fontSize: 13, fontWeight: '700', color: c.textMain, letterSpacing: -0.2 },

  // Filter tabs — pill style, Enchanting Forest
  filterRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  filterTab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1,
    borderColor: c.borderColor,
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: c.accentYellow + '18',
    borderColor: c.accentYellow + '40',
  },
  filterTabText: { fontSize: 11, fontWeight: '600', color: c.textDim },
  filterTabTextActive: { color: c.accentYellow, fontWeight: '700' },

  // Summary strip — compact horizontal stats
  summaryStrip: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: c.accentYellow + '18',
    borderWidth: 1, borderColor: c.accentYellow + '12',
    marginBottom: spacing.sm,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 14, fontWeight: '800', color: c.textMain, letterSpacing: -0.3 },
  summaryLabel: { fontSize: 8, fontWeight: '600', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 1 },
  summaryDivider: { width: 1, height: 22, backgroundColor: c.borderColor },

  // 3-column insight layout
  insightCols: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  insightCol: { flex: 1, paddingHorizontal: spacing.xs },
  insightColBorder: { borderLeftWidth: 1, borderLeftColor: c.borderColor },
  colHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingBottom: 6, marginBottom: 2,
    borderBottomWidth: 1, borderBottomColor: c.borderColor,
  },
  colHeaderText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  colRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6,
  },
  colRowBorder: { borderBottomWidth: 1, borderBottomColor: c.borderColor + '50' },
  colRowIcon: {
    width: 24, height: 24, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  colRowTitle: { fontSize: 12, fontWeight: '700', color: c.textMain },
  colRowSub: { fontSize: 10, color: c.textDim, marginTop: 1 },
  colRowStat: { fontSize: 13, fontWeight: '900', letterSpacing: -0.3, flexShrink: 0 },

  // Keep tileGrid for modal use (legacy)
  tileGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
  },
  // Tile styles (used in modals)
  tileIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: c.textMain },

  qaScroll: { marginHorizontal: -spacing.xl },
  qaContent: { paddingHorizontal: spacing.xl, gap: spacing.md },
  qaItem: { alignItems: 'center', gap: 7, width: 76 },
  qaIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  qaLabel: { fontSize: 11, fontWeight: '600', color: c.textMuted, textAlign: 'center' },

  activityCard: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.lg, overflow: 'hidden' },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  actBorder: { borderBottomWidth: 1, borderBottomColor: c.borderColor },
  actAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actInitials: { fontSize: 12, fontWeight: '800' },
  actInfo: { flex: 1 },
  actName: { fontSize: 13, fontWeight: '600', color: c.textMain },
  actAction: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  actRight: { alignItems: 'flex-end', gap: 4 },
  scorePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  scoreText: { fontSize: 11, fontWeight: '700' },
  actTime: { fontSize: 11, color: c.textDim },

  actRowCompact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  actBorderCompact: { borderBottomWidth: 1, borderBottomColor: c.borderColor + '40' },
  actAvatarCompact: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actInitialsCompact: { fontSize: 10, fontWeight: '800' },
  actInfoCompact: { flex: 1 },
  actNameCompact: { fontSize: 12, fontWeight: '600', color: c.textMain },
  actActionCompact: { fontSize: 10, color: c.textMuted, marginTop: 1 },
  actRightCompact: { alignItems: 'flex-end', gap: 2 },
  scorePillCompact: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  scoreTextCompact: { fontSize: 9, fontWeight: '700' },
  actTimeCompact: { fontSize: 9, color: c.textDim },

  // Modal — centered, Enchanting Forest themed
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', padding: spacing.lg,
  },
  modalSheet: {
    backgroundColor: c.cardDark, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.borderColor,
    maxHeight: '70%', width: '100%', maxWidth: 440,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: c.accentYellow + '18',
    borderBottomWidth: 1, borderBottomColor: c.borderColor,
  },
  modalStat: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  modalHeading: { fontSize: 11, fontWeight: '600', color: c.textMuted, marginTop: 1 },
  modalClose: {
    padding: 4, borderRadius: 8,
    backgroundColor: c.borderColor + '40',
  },
  modalScroll: { paddingHorizontal: 0 },
  modalEmpty: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  modalEmptyText: { fontSize: 12, color: c.textDim, textAlign: 'center' },
  modalAvatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  modalAvatarText: { fontSize: 10, fontWeight: '800' },
  modalRowBorder: { borderBottomWidth: 1, borderBottomColor: c.borderColor },

  // Table layout — compact
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: c.bgDark,
    borderBottomWidth: 1, borderBottomColor: c.borderColor,
  },
  tableCol: { fontSize: 9, fontWeight: '700', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: spacing.md,
  },
  tableRowAlt: { backgroundColor: c.accentYellow + '08' },
  tableCell: {},
  tableStudentName: { fontSize: 12, fontWeight: '700', color: c.textMain },
  tableStudentGrade: { fontSize: 9, color: c.textDim, marginTop: 1 },
  tableChip: {
    fontSize: 9, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 5, borderWidth: 1, alignSelf: 'flex-start',
  },
  pctPill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, borderWidth: 1,
  },
  pctPillText: { fontSize: 10, fontWeight: '800' },
});
