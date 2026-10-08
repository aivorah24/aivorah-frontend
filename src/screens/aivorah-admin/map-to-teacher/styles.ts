import { StyleSheet, Platform } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

export function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 1100, alignSelf: 'center' },

    toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm,
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark,
    },
    filterChipActive: { backgroundColor: colors.accentYellow + '18', borderColor: colors.accentYellow },
    filterChipText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600', color: colors.textMain },

    table: {
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.md, padding: 20, marginBottom: 20,
    },
    tableHeading: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800', color: colors.textHeading, marginBottom: 4 },
    tableSubheading: { fontSize: 11.5, color: colors.textDim, marginBottom: 16 },
    tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingBottom: 8, marginBottom: 4 },
    tableHeaderCell: { flex: 1, fontSize: 10.5, fontWeight: '700', color: colors.textDim, letterSpacing: 0.4 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    tableRowSelected: { backgroundColor: colors.accentYellow + '0c' },
    tableCell: { flex: 1, fontSize: 12.5, color: colors.textMain, fontFamily: Platform.OS === 'web' ? 'Fraunces, Georgia, serif' : 'system' },
    checkbox: {
      width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.borderColor,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    checkboxChecked: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
    emptyRowText: { fontSize: 12.5, color: colors.textDim, paddingVertical: 20, textAlign: 'center' },
    assignedTag: { fontSize: 10.5, color: colors.accentCyan },
    unassignedTag: { fontSize: 10.5, color: colors.accentRed },

    assignCard: {
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.md, padding: 20,
    },
    assignCardTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800', color: colors.textHeading, marginBottom: 14 },
    row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    field: { flex: 1, minWidth: 180, marginBottom: 12 },
    label: { fontSize: 11.5, fontWeight: '700', color: colors.textDim, marginBottom: 6, letterSpacing: 0.3 },
    input: {
      fontFamily: fonts.serif, fontSize: 14, color: colors.textMain,
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm,
      paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bgDark,
    },
    hint: { fontSize: 11.5, color: colors.textDim, marginTop: 6 },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.accentRed + '12', borderWidth: 1, borderColor: colors.accentRed + '30',
      borderRadius: radius.sm, padding: 10, marginBottom: 14,
    },
    errorText: { fontSize: 12.5, color: colors.accentRed, flex: 1 },
    successBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.accentCyan + '12', borderWidth: 1, borderColor: colors.accentCyan + '30',
      borderRadius: radius.sm, padding: 10, marginBottom: 14,
    },
    successText: { fontSize: 12.5, color: colors.accentCyan, flex: 1 },

    submitBtn: { backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
    submitBtnText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: '#0B0B0B' },

    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 360 },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor },
    retryText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
  });
}
