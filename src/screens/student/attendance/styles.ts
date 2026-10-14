import { StyleSheet, Platform } from 'react-native';
import { spacing, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

// Same shape as parent/attendance/styles.ts (that screen's layout — rate
// card, stat cards, calendar, logs — is reused here for a single student,
// minus the child-switcher tabs and "Message Teacher" action).
export function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.xl, paddingBottom: 60 },
    loadingWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 300 },
    layoutRow: { flexDirection: 'column', gap: 20 },
    layoutRowWide: { flexDirection: 'row', alignItems: 'flex-start' },
    leftColumn: { width: '100%' },
    leftColumnWide: { width: '30%' },
    rightColumn: { width: '100%' },
    rightColumnWide: { width: '70%' },
    overallRateCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: 16, padding: 16, marginBottom: 12,
    },
    overallRateText: { fontFamily: fonts.serif, fontSize: 22, fontWeight: '800', color: colors.accentYellow },
    overallRateLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    statsCardsGrid: { gap: 10, marginBottom: 12 },
    statCard: {
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderLeftWidth: 4, borderRadius: 10, padding: 12, gap: 4,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    statCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
    statValue: { fontSize: 22, fontWeight: '800', fontFamily: Platform.OS === 'web' ? 'Fraunces, Georgia, serif' : 'system' },
    statLabel: { fontSize: 11, fontFamily: Platform.OS === 'web' ? 'Fraunces, Georgia, serif' : 'system', fontWeight: '600', marginTop: 2 },
    noRecordsBanner: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.accentYellow + '10', borderWidth: 1, borderColor: colors.accentYellow + '30',
      borderRadius: 8, padding: 10, marginTop: 4,
    },
    noRecordsText: { fontSize: 11.5, color: colors.textMain, fontWeight: '500', flex: 1 },
    recordsSection: {
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: 16, padding: 20, gap: 20,
    },
    recordsTitle: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '800', color: colors.textHeading, marginBottom: 4 },
    calendarCard: {
      width: '100%', backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: 12, padding: 16,
    },
    calendarHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    navArrowBtn: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardDark,
      borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center', justifyContent: 'center',
    },
    calendarMonthTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: colors.textHeading },
    calendarWeekdaysRow: {
      flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
      borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingBottom: 6,
    },
    calendarWeekdayText: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textDim },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    calendarDayCell: { width: '14.28%', height: 44, alignItems: 'center', justifyContent: 'center', marginVertical: 1 },
    calendarDayText: { fontSize: 12.5, color: colors.textMain },
    calendarDayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },
    calendarDayUnderline: { width: 14, height: 2.5, borderRadius: 1.25, marginTop: 2 },
    activityLogsContainer: { marginTop: 8, gap: 12 },
    activityLogsTitle: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: colors.textHeading },
    logList: { gap: 8 },
    logItem: {
      backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14,
    },
    logItemMain: { gap: 4 },
    logItemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logItemDate: { fontSize: 13, color: colors.textMain, fontWeight: '700' },
    statusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1 },
    statusBadgeText: { fontSize: 10.5, fontWeight: '700' },
    logItemComment: { fontSize: 12, color: colors.textMuted, lineHeight: 16, marginTop: 4 },
    emptyLogsCard: {
      alignItems: 'center', justifyContent: 'center', paddingVertical: 20,
      backgroundColor: colors.bgDark, borderRadius: 8, borderWidth: 1, borderColor: colors.borderColor, borderStyle: 'dashed',
    },
    emptyLogsText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
    statIconBadge: { alignItems: 'center', justifyContent: 'center' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { fontFamily: fonts.serif, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  });
}
