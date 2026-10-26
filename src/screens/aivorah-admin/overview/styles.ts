import { StyleSheet, Platform } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

export function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    headerRow: { flexDirection: 'row', alignItems: 'flex-end' },
    refreshBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm,
      paddingHorizontal: 14, height: 36, marginRight: spacing.xl, marginBottom: spacing.md,
    },
    refreshBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600', color: colors.textMain },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 1200, alignSelf: 'center' },

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
    tableHeading: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800', color: colors.textHeading },
    tableSubheading: { fontSize: 11.5, color: colors.textDim, marginTop: 2, marginBottom: 16 },
    tableHeaderRow: {
      flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingBottom: 8, marginBottom: 4,
    },
    tableHeaderCell: { flex: 1, fontSize: 10.5, fontWeight: '700', color: colors.textDim, letterSpacing: 0.4 },
    tableHeaderCellBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
    searchInput: {
      height: 32, minWidth: 160, paddingHorizontal: 10, borderRadius: radius.sm,
      borderWidth: 1, borderColor: colors.borderColor, fontSize: 12.5, color: colors.textMain,
      backgroundColor: colors.bgDark,
    },
    tableRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.borderColor,
    },
    tableCell: { flex: 1, fontSize: 12.5, color: colors.textMain, fontFamily: Platform.OS === 'web' ? 'Fraunces, Georgia, serif' : 'system' },
    tableCellSchool: { fontWeight: '700', color: colors.textHeading },
    tableRowAlt: { backgroundColor: colors.bgDark },
    emptyRowText: { fontSize: 12.5, color: colors.textDim, paddingVertical: 20, textAlign: 'center' },
    // Caps a long table (e.g. 158 students) to a fixed, scrollable height —
    // an admin scanning the Overview shouldn't have to scroll the whole page
    // past hundreds of rows to reach the next section. The header row stays
    // outside this (not scrolled) so column labels are always visible.
    // NOTE: a fixed `height` (not `maxHeight`) — React Native Web's
    // ScrollView doesn't reliably clip to `maxHeight` alone (the inner
    // content can grow past it uncapped), and a fixed height also gives
    // every DISTRIBUTION card below the same footprint instead of each one
    // sizing to its own row count.

    distGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
    distCard: {
      flexGrow: 1, flexBasis: 260, minWidth: 240,
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.md, padding: 16,
    },
    distCardTitle: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: colors.textHeading, marginBottom: 10 },
    // A fixed `height` (not `maxHeight` — RN Web's ScrollView doesn't clip to it)
    // so every DISTRIBUTION card is the same size regardless of row count: a
    // 16-row list (Grade Distribution) scrolls inside this box instead of
    // stretching the card, and a 2-row list (Assignments by Type) gets the
    // same footprint instead of looking empty next to a taller sibling.
    distCardBody: { height: 216, overflow: 'hidden', gap: 10 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
    barLabel: { width: 90, fontSize: 11.5, color: colors.textMuted },
    barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.borderColor, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    barValue: { width: 34, textAlign: 'right', fontSize: 11.5, fontWeight: '700', color: colors.textHeading },

    tableHalfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tableHalf: { flexGrow: 1, flexBasis: 320, minWidth: 280 },

    filterTabs: { flexDirection: 'row', gap: 6 },
    filterTab: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm,
      borderWidth: 1, borderColor: colors.borderColor,
    },
    filterTabActive: { backgroundColor: colors.accentYellow + '22', borderColor: colors.accentYellow },
    filterTabText: { fontSize: 11.5, fontWeight: '600', color: colors.textMuted },
    filterTabTextActive: { color: colors.accentYellow },

    tableToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    exportBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32,
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm,
    },
    exportBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.textMain },

    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 360 },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor },
    retryText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
  });
}
