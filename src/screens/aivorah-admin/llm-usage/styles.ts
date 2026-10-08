import { StyleSheet, Platform } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

export function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    headerRow: { flexDirection: 'row', alignItems: 'flex-end' },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 1200, alignSelf: 'center' },

    daysTabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    dayTab: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm,
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark,
    },
    dayTabActive: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
    dayTabText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600', color: colors.textMain },
    dayTabTextActive: { color: '#0B0B0B' },

    sectionTitle: {
      fontFamily: fonts.serif, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8,
      color: colors.textDim, marginBottom: 12, marginTop: 20,
    },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    kpiCard: {
      flexGrow: 1, flexBasis: 220, minWidth: 200,
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.md, overflow: 'hidden',
    },
    kpiTopRow: { height: 4, flexDirection: 'row' },
    kpiBar: { flex: 1 },
    kpiBody: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16 },
    kpiValue: { fontFamily: fonts.serif, fontSize: 24, fontWeight: '800', color: colors.textHeading },
    kpiLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

    table: {
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.md, padding: 20,
    },
    tableHeading: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800', color: colors.textHeading, marginBottom: 16 },
    tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingBottom: 8, marginBottom: 4 },
    tableHeaderCell: { flex: 1, fontSize: 10.5, fontWeight: '700', color: colors.textDim, letterSpacing: 0.4 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    tableCell: { flex: 1, fontSize: 12.5, color: colors.textMain, fontFamily: Platform.OS === 'web' ? 'Fraunces, Georgia, serif' : 'system' },
    tableCellStrong: { fontWeight: '700', color: colors.textHeading },
    emptyRowText: { fontSize: 12.5, color: colors.textDim, paddingVertical: 20, textAlign: 'center' },

    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 360 },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor },
    retryText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
  });
}
