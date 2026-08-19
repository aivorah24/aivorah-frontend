import { StyleSheet } from 'react-native';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

export const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  content: { padding: spacing.xl, paddingBottom: 40, gap: spacing.lg },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, alignSelf: 'flex-start', minWidth: 260, maxWidth: 360 },
  searchInput: { flex: 1, fontSize: 13, outlineStyle: 'none' } as any,

  progressCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  ring: { width: 52, height: 52, borderRadius: 26, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 13, fontWeight: '700' },
  progressLine: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700' },
  progressSub: { fontSize: 12, marginTop: 2 },

  chapterCard: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  chapterNum: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  chapterNumText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700' },
  chapterTitle: { fontFamily: fonts.serif, fontSize: 15.5, fontWeight: '700' },
  chapterSub: { fontSize: 11.5, marginTop: 2 },
  comingSoonBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  comingSoonText: { fontSize: 10, fontWeight: '600' },
  chapterProgress: { alignItems: 'flex-end', gap: 4, width: 60 },
  progBarTrack: { width: 56, height: 4, borderRadius: 3, overflow: 'hidden' },
  progBarFill: { height: '100%', borderRadius: 3 },
  progPctText: { fontSize: 10.5, fontFamily: fonts.serif },

  topicGrid: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  topicItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  topicDot: { width: 8, height: 8, borderRadius: 4 },
  topicLabel: { fontSize: 13.5, fontWeight: '600' },
  topicKind: { fontSize: 11, marginTop: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  emptyText: { fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.lg },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
