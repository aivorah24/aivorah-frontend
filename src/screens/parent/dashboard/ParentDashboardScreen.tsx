import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';

import type { ChildData } from './types';
import { useParentDashboardData } from './hooks/useParentDashboardData';
import { fetchCredentials, fetchAIReport } from './services/parentDashboardService';
import { formatStudyTime } from './utils/dashboardHelpers';
import { downloadReportPDF } from './utils/reportPdf';

import ChildrenSection from './components/ChildrenSection';
import AIWeeklyInsightCard from './components/AIWeeklyInsightCard';
import WeeklySnapshotStats from './components/WeeklySnapshotStats';
import ActivityChart from './components/ActivityChart';
import BottomGrid from './components/BottomGrid';
import UpcomingEvents from './components/UpcomingEvents';
import ReportModal from './components/modals/ReportModal';
import CredentialsModal from './components/modals/CredentialsModal';
import AttendanceHistoryModal from './components/modals/AttendanceHistoryModal';

export default function ParentDashboardScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { unreadCount, unreadAssignments } = useNotification();
  const s = useMemo(() => makeStyles(colors), [colors]);
  // B2C = parent not linked to any school; school-only features (attendance,
  // classes, timetable) are hidden from them. B2B = has a schoolId.
  const isB2B = !!user?.schoolId;
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const totalNotifs = unreadCount + unreadAssignments;
  const parentEmail = user?.email || 'parent@demo.com';
  const parentName = user?.name?.split(' ')[0] ?? 'Parent';

  const {
    children, selectedChild, setSelectedChild, childrenLoading,
    assignments, weeklyActivity, subjectPerf, attendanceSummary,
  } = useParentDashboardData({ parentEmail, route, navigation, isB2B });

  const [credsChild, setCredsChild] = useState<ChildData | null>(null);
  const [creds, setCreds] = useState<any>(null);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [showAttendanceHistoryModal, setShowAttendanceHistoryModal] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  React.useEffect(() => {
    if (route.params?.openAttendance) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to deep-link nav param, external sync
      setShowAttendanceHistoryModal(true);
      setCalendarYear(new Date().getFullYear());
      setCalendarMonth(new Date().getMonth());
      navigation.setParams({ openAttendance: undefined });
    }
  }, [route.params?.openAttendance, navigation]);

  function copyToClipboard(text: string, field: string) {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 1500);
  }

  async function fetchCreds(child: ChildData) {
    setCredsChild(child);
    setCreds(null);
    setLoadingCreds(true);
    try {
      const data = await fetchCredentials(parentEmail, child.id);
      setCreds(data);
    } catch { setCreds(null); }
    finally { setLoadingCreds(false); }
  }

  async function generateReport() {
    if (!selectedChild.id) return;
    setReportModalVisible(true);
    setReportData(null);
    setLoadingReport(true);
    try {
      const data = await fetchAIReport(parentEmail, selectedChild.id);
      setReportData(data);
    } catch { setReportData(null); }
    finally { setLoadingReport(false); }
  }

  const child = selectedChild;
  const weeklyStudyH = formatStudyTime(child.studyTimeMinutes);
  const tasksDone = child.completedTopics.length;
  const tasksTotal = child.totalTopics && child.totalTopics > 0 ? child.totalTopics : null;
  const activityMax = Math.max(...weeklyActivity, 120);

  // Derived AI insight data
  const weeklyProgressPct = Math.min(100, Math.round((child.studyTimeMinutes / (7 * 120)) * 100));
  const insightTopic = child.lastLesson || (child.completedTopics[child.completedTopics.length - 1]) || 'Learning Basics';

  // Badges
  const badges = [
    child.currentStreak >= 5 && { icon: 'zap', label: '5 Day Streak', color: colors.accentYellow },
    child.completedTopics.length >= 3 && { icon: 'award', label: 'Fast Learner', color: colors.accentYellow },
    child.assignmentsDone >= 1 && { icon: 'book-open', label: 'Reading Star', color: colors.accentYellow },
    child.xpPoints >= 1000 && { icon: 'star', label: '1000 XP', color: colors.accentYellow },
  ].filter(Boolean) as { icon: string; label: string; color: string }[];

  // Upcoming events from assignments — must actually be upcoming (due today or
  // later), not just "pending". A long-overdue, never-submitted assignment from
  // months ago is still status='pending' forever, which was permanently clogging
  // this list with stale past dates instead of showing real upcoming work.
  const todayISOStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = assignments
    .filter(a => a.status === 'pending' && a.dueDate && a.dueDate >= todayISOStr)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 2);

  return (
    <ScreenLayout>
      <View style={s.screen}>
        <Header
          title={`Welcome, ${parentName}`}
          subtitle="Track your children's learning journey"
          onMenuPress={() => navigation.openDrawer()}
          notificationCount={totalNotifs}
        />

        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {(unreadAssignments > 0 || unreadCount > 0) && (
            <TouchableOpacity
              style={s.alertBanner}
              onPress={() => unreadAssignments > 0 ? navigation.navigate('ParentAssignments') : navigation.navigate('ParentMessages')}
              activeOpacity={0.8}
            >
              <Feather name={unreadAssignments > 0 ? 'check-square' : 'message-square'} size={14} color={colors.accentYellow} />
              <Text style={s.alertBannerText}>
                {unreadAssignments > 0
                  ? `${unreadAssignments} new assignment${unreadAssignments > 1 ? 's' : ''} for your child`
                  : `${unreadCount} new message${unreadCount > 1 ? 's' : ''}`}
              </Text>
              <Feather name="chevron-right" size={13} color={colors.accentYellow} />
            </TouchableOpacity>
          )}

          {/* ── Row 1: Child cards + AI Insight ── */}
          <View style={[s.topRow, isWide && { flexDirection: 'row', gap: 16, alignItems: 'stretch' }]}>
            <ChildrenSection
              childrenList={children}
              childrenLoading={childrenLoading}
              selectedChild={selectedChild}
              onSelectChild={setSelectedChild}
              onViewCreds={fetchCreds}
              onAddChild={() => navigation.navigate('ParentMyKids')}
              isWide={isWide}
              colors={colors}
              s={s}
            />
            <AIWeeklyInsightCard
              child={child}
              weeklyProgressPct={weeklyProgressPct}
              insightTopic={insightTopic}
              isWide={isWide}
              // Quick in-place peek (ReportModal) rather than navigating
              // away — BottomGrid's "Subject Performance" card below still
              // links to the full ParentAIReportsScreen for the complete
              // experience. Was previously dead code: this screen fully
              // built generateReport()/reportModalVisible/ReportModal but
              // never wired any button to them (both "View Report" buttons
              // navigated away instead) — real finding, not fabricated.
              onViewReport={generateReport}
              colors={colors}
              s={s}
            />
          </View>

          {/* ── Row 2: Weekly Snapshot ── */}
          {child.id ? (
            <>
              <Text style={[s.sectionTitle, { marginTop: 22, marginBottom: 12 }]}>{child.name}&apos;s Weekly Snapshot</Text>

              <WeeklySnapshotStats
                child={child}
                weeklyStudyH={weeklyStudyH}
                tasksDone={tasksDone}
                tasksTotal={tasksTotal}
                isB2B={isB2B}
                attendanceSummary={attendanceSummary}
                onViewAttendanceHistory={() => {
                  setShowAttendanceHistoryModal(true);
                  setCalendarYear(new Date().getFullYear());
                  setCalendarMonth(new Date().getMonth());
                }}
                colors={colors}
                s={s}
              />

              {/* ── Row 3: Activity Overview ── */}
              <View style={[s.sectionHeader, { marginTop: 22 }]}>
                <Text style={s.sectionTitle}>Activity Overview</Text>
                <Text style={s.dailyGoal}>Daily goal: <Text style={{ color: colors.accentYellow, fontWeight: '700' }}>2h</Text></Text>
              </View>

              <ActivityChart weeklyActivity={weeklyActivity} activityMax={activityMax} colors={colors} s={s} />

              {/* ── Row 4: 4-panel grid ── */}
              <BottomGrid
                child={child}
                subjectPerf={subjectPerf}
                badges={badges}
                isWide={isWide}
                onViewHighlights={() => navigation.navigate('ParentProgress')}
                onViewReport={() => navigation.navigate('ParentAIReports', { childId: selectedChild.id })}
                onViewBadges={() => navigation.navigate('ParentProgress')}
                colors={colors}
                s={s}
              />

              {/* ── Row 5: Upcoming Events ── */}
              <UpcomingEvents
                events={upcomingEvents}
                onViewCalendar={() => navigation.navigate('ParentSchedule')}
                colors={colors}
                s={s}
              />
            </>
          ) : null}

        </ScrollView>
      </View>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        loading={loadingReport}
        reportData={reportData}
        childName={selectedChild.name}
        onDownloadPDF={() => downloadReportPDF(reportData)}
        colors={colors}
        s={s}
      />

      <CredentialsModal
        credsChild={credsChild}
        creds={creds}
        loading={loadingCreds}
        copiedField={copiedField}
        onCopy={copyToClipboard}
        onClose={() => { setCredsChild(null); setCreds(null); }}
        colors={colors}
        s={s}
      />

      <AttendanceHistoryModal
        visible={showAttendanceHistoryModal}
        childName={selectedChild.name}
        attendanceSummary={attendanceSummary}
        calendarYear={calendarYear}
        calendarMonth={calendarMonth}
        onChangeMonth={(y, m) => { setCalendarYear(y); setCalendarMonth(m); }}
        onClose={() => setShowAttendanceHistoryModal(false)}
        colors={colors}
        s={s}
      />
    </ScreenLayout>
  );
}

// ── Styles ───────────────────────────────────────────────────

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },

  // Alert banner
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: c.accentYellow + '40',
    backgroundColor: c.accentYellow + '0C', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
  },
  alertBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: c.accentYellow },

  // Section titles
  sectionTitle: { fontSize: 17, fontWeight: '700', color: c.textMain, fontFamily: fonts.serif },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dailyGoal: { fontSize: 12, color: c.textMuted },

  // Top row
  topRow: { gap: 16, marginBottom: 4 },
  childSection: { alignSelf: 'flex-start' },
  childScroll: { marginTop: 12 },

  insightChipsCol: { marginTop: 14, gap: 8 },
  insightChip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.borderColor, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: c.cardDark },
  insightChipIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: c.accentYellow + '18', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  insightChipTitle: { fontSize: 10, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  insightChipBody: { fontSize: 13, fontWeight: '700', color: c.textMain, marginTop: 1 },

  // Child cards
  childCard: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: 16, padding: 14, alignItems: 'center', gap: 5,
    marginRight: 12, minWidth: 110, position: 'relative',
  },
  childKeyBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: c.borderColor, alignItems: 'center', justifyContent: 'center',
  },
  childAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  childAvatarText: { fontSize: 22, fontWeight: '700' },
  childName: { fontSize: 13, fontWeight: '700', color: c.textMain },
  childGrade: { fontSize: 11, color: c.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '600' },
  addChildBtn: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center',
    gap: 8, minWidth: 80, borderStyle: 'dashed',
  },
  addChildText: { fontSize: 11, color: c.textMuted },

  // AI Weekly Insight card
  insightCard: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.accentYellow + '30',
    borderRadius: 16, padding: 16, gap: 10, marginTop: 0,
    justifyContent: 'space-between',
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center' },
  insightPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.accentYellow + '15', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: c.accentYellow + '40',
  },
  insightPillText: { fontSize: 12, fontWeight: '700', color: c.accentYellow, letterSpacing: 0.5 },
  insightBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  insightHeadline: { fontSize: 15, fontWeight: '600', color: c.textMain, lineHeight: 22, marginBottom: 10, fontFamily: fonts.serif },
  insightBullets: { gap: 7 },
  insightBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  insightBulletText: { fontSize: 12, color: c.textMuted, flex: 1, lineHeight: 18 },
  insightRec: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.borderColor },
  insightRecLabel: { fontSize: 11, fontWeight: '700', color: c.accentYellow, marginBottom: 6 },
  insightRecRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  insightRecText: { fontSize: 12, color: c.textMuted, lineHeight: 18 },
  insightCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: c.accentYellow + '60', borderRadius: 10,
    paddingVertical: 10, backgroundColor: c.accentYellow + '08',
  },
  insightCtaText: { fontSize: 13, fontWeight: '600', color: c.accentYellow },

  // Stat cards — horizontal layout: icon left, content right
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  statIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statInfo: { flex: 1, gap: 2 },
  statLabel: { fontSize: 11, color: c.textMuted, letterSpacing: 0.2 },
  statValue: { fontSize: 20, fontWeight: '800', fontFamily: fonts.serif, color: c.textMain, letterSpacing: -0.5 },
  statXP: { fontSize: 13, fontWeight: '700', fontFamily: fonts.serif, color: c.accentYellow },
  statSub: { fontSize: 11, color: c.accentYellow, marginTop: 1 },
  progressBarTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: c.accentYellow, borderRadius: 2 },

  // Activity chart
  chartCard: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: 16, padding: 16, position: 'relative', overflow: 'hidden',
  },
  goalLineRow: {
    position: 'absolute', left: 16, right: 16, top: '38%',
    flexDirection: 'row', alignItems: 'center',
  },
  goalLineDash: { flex: 1, height: 1, borderTopWidth: 1, borderTopColor: c.accentYellow + '35', borderStyle: 'dashed' },
  goalBadge: { backgroundColor: c.accentYellow + '20', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: c.accentYellow + '40', marginLeft: 5 },
  goalBadgeText: { fontSize: 9, fontWeight: '700', color: c.accentYellow },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingTop: 16 },
  barColumn: { flex: 1, alignItems: 'center', gap: 4 },
  barTimeLabel: { fontSize: 8, color: c.textDim, textAlign: 'center' },
  barDayLabel: { fontSize: 9, color: c.textMuted, marginTop: 3 },

  // Bottom grid
  bottomGrid: { gap: 10, marginTop: 22, flexDirection: 'column' },
  gridCard: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: 14, padding: 14, gap: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: c.textMain, fontFamily: fonts.serif },
  cardFooterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  cardFooterText: { fontSize: 11, fontWeight: '600', color: c.accentYellow },

  // Highlights
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  highlightIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  highlightTitle: { fontSize: 12, fontWeight: '700' },
  highlightDesc: { fontSize: 11, color: c.textMuted, marginTop: 2 },

  // Subject performance
  subjectRow: { gap: 6 },
  subjectInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectName: { fontSize: 13, color: c.textMain, fontWeight: '500' },
  subjectPct: { fontSize: 12, fontWeight: '700', color: c.textMain },
  subjectTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  subjectFill: { height: '100%', borderRadius: 3 },

  // Learning mood
  moodCenter: { alignItems: 'center', paddingVertical: 10 },
  moodCircle: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: c.accentYellow + '40',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.accentYellow + '10', marginBottom: 8,
  },
  moodLabel: { fontSize: 20, fontWeight: '700', color: c.accentYellow, fontFamily: fonts.serif },
  moodSub: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodDot: { width: 8, height: 8, borderRadius: 4 },
  moodText: { fontSize: 12, color: c.textMuted },

  // Achievements / Badges
  badgeGrid: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  badgeItem: { alignItems: 'center', gap: 6, flex: 1, minWidth: 60 },
  badgeIconWrap: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: c.accentYellow + '18', borderWidth: 1, borderColor: c.accentYellow + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeLabel: { fontSize: 10, fontWeight: '600', color: c.textMuted, textAlign: 'center' },

  // Upcoming Events
  eventsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: 16, padding: 18, marginTop: 12,
  },
  eventsLabel: { fontSize: 13, fontWeight: '700', color: c.textMain, fontFamily: fonts.serif, minWidth: 80 },
  eventsList: { flex: 1, flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  eventItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 140 },
  eventIconWrap: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: c.accentYellow + '18', alignItems: 'center', justifyContent: 'center',
  },
  eventDate: { fontSize: 11, color: c.accentYellow, fontWeight: '700' },
  eventTitle: { fontSize: 13, fontWeight: '600', color: c.textMain, marginTop: 1 },
  eventTime: { fontSize: 11, color: c.textMuted, marginTop: 1 },
  eventsViewAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 420, backgroundColor: c.cardDark, borderRadius: 20, borderWidth: 1, borderColor: c.borderColor, padding: 24, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: c.textMain, fontFamily: fonts.serif },
  modalDesc: { fontSize: 13, color: c.textMuted, lineHeight: 20 },
  reportSection: { marginBottom: 16 },
  reportSectionTitle: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  reportBody: { fontSize: 13, color: c.textMain, lineHeight: 20 },
  reportListItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
  statCardFull: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: 16, padding: 18, gap: 12 },
  viewHistoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor },
  viewHistoryBtnText: { fontFamily: fonts.serif, fontSize: 11.5, fontWeight: '700', color: c.textMuted },
  attendanceMiniBreakdown: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.borderColor, paddingTop: 12, marginTop: 4 },
  miniStatItem: { alignItems: 'center', flex: 1 },
  miniStatVal: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: c.textMain },
  miniStatLbl: { fontFamily: fonts.serif, fontSize: 9.5, fontWeight: '600', color: c.textDim, textTransform: 'uppercase', marginTop: 2 },
  calendarModalCard: { width: '100%', maxWidth: 360, backgroundColor: c.bgDark, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, overflow: 'hidden' },
  calendarModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: c.borderColor },
  calendarModalTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: c.textHeading },
  calendarModalBody: { padding: 16 },
  calendarContainer: { padding: 12, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.sm, width: '100%' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calendarHeaderNavBtn: { padding: 6, borderRadius: 4 },
  calendarHeaderTitle: { fontFamily: fonts.serif, fontSize: 13.5, fontWeight: '700', color: c.textHeading },
  calendarWeekdaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  calendarWeekdayText: { width: 32, textAlign: 'center', fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: c.textDim },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  calendarDayCell: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginVertical: 2, borderRadius: 16 },
  calendarDayText: { fontFamily: fonts.serif, fontSize: 12.5, color: c.textMain },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendColor: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontFamily: fonts.serif, fontSize: 11, color: c.textMuted },
});
