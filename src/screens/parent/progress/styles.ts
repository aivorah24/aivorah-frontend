import { StyleSheet } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

export const AV = {
  coral:  '#C4836A',
  rose:   '#C85870',
  purple: '#9B7EC8',
  cream:  '#F7F3EF',
  sand:   '#EDE8E2',
};

export const makeStyles = (colors: AppColors, isDark: boolean) => StyleSheet.create({
  screen:  { flex: 1 },
  scroll:  { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },

  // Child tabs
  tab:         { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  tabActive:   { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 },
  tabText:     { fontFamily: fonts.serif, fontSize: 12, fontWeight: '600' },
  tabTextActive: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: '#0B0B0B' },

  // Cards
  card: { borderRadius: radius.xl, padding: spacing.md, borderWidth: 1 },

  // Hero
  avatarCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: fonts.serif, fontSize: 24, fontWeight: '900', color: '#fff' },
  heroChip:     { alignItems: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },

  // Section icon
  secIcon:   { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '800' },

  // Curriculum progress
  mileDot:      { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  viewBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },

  // Weekly chart
  goalBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  barsRow:      { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, paddingTop: 10 },
  barWrapper:   { flex: 1, alignItems: 'center', gap: 4 },
  barTimeLabel: { fontFamily: fonts.serif, fontSize: 8, fontWeight: '700', height: 11, textAlign: 'center' },
  barTrack:     { width: 20, height: 72, borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:      { width: '100%', borderRadius: 10 },
  barDayLabel:  { fontFamily: fonts.serif, fontSize: 9 },

  // Subject progress
  subjectIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  subjTrack:   { height: 6, borderRadius: 3, overflow: 'hidden' },
  subjFill:    { height: '100%', borderRadius: 3 },

  // Practice rows
  pill:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  practiceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 8, borderLeftWidth: 2 },

  // AI Insights
  insightRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  insightIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Achievements — badge style
  achieveBadge:     { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
  achieveBadgeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
