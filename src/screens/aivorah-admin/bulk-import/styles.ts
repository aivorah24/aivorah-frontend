import { StyleSheet, Platform } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

export function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 900, alignSelf: 'center' },

    card: {
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.md, padding: 20, marginBottom: 20,
    },
    cardTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800', color: colors.textHeading, marginBottom: 14 },
    row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    field: { flex: 1, minWidth: 160, marginBottom: 12 },
    label: { fontSize: 11.5, fontWeight: '700', color: colors.textDim, marginBottom: 6, letterSpacing: 0.3 },
    input: {
      fontFamily: fonts.serif, fontSize: 14, color: colors.textMain,
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm,
      paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bgDark,
    },
    textarea: {
      fontFamily: fonts.serif, fontSize: 13.5, color: colors.textMain,
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm,
      paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bgDark,
      minHeight: 140, textAlignVertical: 'top',
    },
    hint: { fontSize: 11.5, color: colors.textDim, marginTop: 6 },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.accentRed + '12', borderWidth: 1, borderColor: colors.accentRed + '30',
      borderRadius: radius.sm, padding: 10, marginBottom: 14,
    },
    errorText: { fontSize: 12.5, color: colors.accentRed, flex: 1 },

    submitBtn: {
      backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingVertical: 13,
      alignItems: 'center', marginTop: 4,
    },
    submitBtnText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: '#0B0B0B' },

    table: {
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.md, padding: 20,
    },
    tableHeading: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800', color: colors.textHeading, marginBottom: 4 },
    tableSubheading: { fontSize: 11.5, color: colors.textDim, marginBottom: 16 },
    tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingBottom: 8, marginBottom: 4 },
    tableHeaderCell: { flex: 1, fontSize: 10.5, fontWeight: '700', color: colors.textDim, letterSpacing: 0.4 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    tableCell: { flex: 1, fontSize: 12.5, color: colors.textMain, fontFamily: Platform.OS === 'web' ? 'Fraunces, Georgia, serif' : 'system' },
    tableCellMono: { fontFamily: Platform.OS === 'web' ? 'monospace' : 'system' },
    errorRow: { backgroundColor: colors.accentRed + '08' },

    resetBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor, alignSelf: 'flex-start', marginTop: 14 },
    resetBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
  });
}
