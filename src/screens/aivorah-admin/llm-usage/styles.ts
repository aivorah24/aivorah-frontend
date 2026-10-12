import { StyleSheet } from 'react-native';
import { radius } from '../../../theme';
import type { AppColors } from '../../../theme';

export function makeStyles(c: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bgDark },
    content: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 72, width: '100%', maxWidth: 1320, alignSelf: 'center', gap: 14 },

    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' },
    rangeText: { fontSize: 12.5, color: c.textDim, marginRight: 'auto' as any },
    segment: { flexDirection: 'row', padding: 3, borderRadius: 12, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark },
    segBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
    segBtnOn: { backgroundColor: c.textMain },
    segText: { fontSize: 12, fontWeight: '700', color: c.textMuted },
    segTextOn: { color: c.bgDark },

    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    kpiCard: {
      flexGrow: 1, flexBasis: 230, minWidth: 220, overflow: 'hidden',
      borderWidth: 1, borderColor: c.borderColor, borderRadius: 20, paddingTop: 18, paddingHorizontal: 18, backgroundColor: c.cardDark,
    },
    kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    kpiIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center' },
    kpiLabel: { fontSize: 13, color: c.textMuted },
    kpiValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: c.textMain },
    kpiDelta: { fontSize: 12, color: c.textMuted, marginTop: 8 },
    kpiSpark: { marginTop: 6, marginHorizontal: -18 },

    insight: {
      flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 22,
    },
    insightIcon: {
      width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.accentYellow + '1F', borderWidth: 1, borderColor: c.accentYellow,
    },
    insightHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    insightTitle: { fontSize: 14, fontWeight: '800', color: c.accentYellow },
    insightTag: {
      fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: c.textMuted,
      borderWidth: 1, borderColor: c.borderColor, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    },
    insightText: { fontSize: 13.5, lineHeight: 21, color: c.textMuted, marginTop: 4 },
    ghostBtn: { height: 40, paddingHorizontal: 16, borderRadius: 11, borderWidth: 1, borderColor: c.borderColor, justifyContent: 'center' },
    ghostBtnText: { fontSize: 13, fontWeight: '700', color: c.accentYellow },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    cell: { flexGrow: 1, flexBasis: 340, minWidth: 300 },
    cellWide: { flexGrow: 1.4, flexBasis: 380, minWidth: 300 },
    card: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: 20, padding: 24 },
    cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: c.textMain },
    cardSub: { fontSize: 12.5, color: c.textDim, marginTop: 3 },
    bigValue: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6, color: c.textMain, marginTop: 12 },

    donutRow: { flexDirection: 'row', alignItems: 'center', gap: 22, flexWrap: 'wrap', marginTop: 18 },
    legend: { flex: 1, minWidth: 150, gap: 14 },
    legendName: { fontSize: 13.5, fontWeight: '700', color: c.textMain },
    legendValue: { fontSize: 12, color: c.textMuted, marginLeft: 15, marginTop: 1 },

    qualityHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
    qualityName: { fontSize: 13, fontWeight: '800', color: c.textMain, flexShrink: 1 },
    qualityMeta: { fontSize: 13, color: c.textMuted },
    track: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: c.bgDark },
    trackFill: { height: '100%', borderRadius: 4 },

    smallBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14,
      borderRadius: 10, borderWidth: 1, borderColor: c.borderColor,
    },
    smallBtnText: { fontSize: 12, fontWeight: '700', color: c.textMain },
    thRow: {
      flexDirection: 'row', gap: 8, marginTop: 14, paddingVertical: 11, paddingHorizontal: 12,
      borderRadius: 10, backgroundColor: c.bgDark,
    },
    th: { flex: 1, fontSize: 12, fontWeight: '600', color: c.textMuted },
    tr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.borderColor },
    td: { flex: 1, fontSize: 13, color: c.textMain },
    tdStrong: { fontSize: 13, fontWeight: '800', color: c.textMain },
    tdSub: { fontSize: 11, color: c.textDim, marginTop: 1 },
    modelCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    modelAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    modelAvatarText: { fontSize: 11, fontWeight: '800', color: c.cardDark },

    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.borderColor },
    activityTime: { width: 92, fontSize: 12, color: c.textDim },
    dot: { width: 18, fontSize: 12, textAlign: 'center' },

    emptyRowText: { fontSize: 12.5, color: c.textDim, paddingVertical: 16, textAlign: 'center' },
    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 360 },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor },
    retryText: { fontSize: 12.5, fontWeight: '700', color: c.accentYellow },
  });
}
