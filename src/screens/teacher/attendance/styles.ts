import { StyleSheet, Platform } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

const serif = Platform.OS === 'web' ? 'Fraunces, Georgia, serif' : 'system';

export function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: spacing.xl, paddingBottom: 80, maxWidth: 1200, width: '100%', alignSelf: 'center', gap: 16 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36,
      borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark,
    },
    chipActive: { borderColor: colors.accentYellow, backgroundColor: `${colors.accentYellow}18` },
    chipText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMain },
    chipTextActive: { color: colors.accentYellow, fontWeight: '700' },
    dateBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardDark, borderWidth: 1,
      borderColor: colors.borderColor, borderRadius: radius.sm, paddingHorizontal: 12, height: 36, marginLeft: 'auto',
    },
    dateInput: { width: 110, fontSize: 13.5, fontFamily: fonts.serif, color: colors.textMain, padding: 0 } as any,
    statsContainer: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, borderWidth: 1, borderLeftWidth: 4, borderRadius: 10, padding: 12, gap: 4 },
    statValue: { fontSize: 22, fontWeight: '800', fontFamily: serif },
    statLabel: { fontSize: 11, fontFamily: serif, fontWeight: '600', marginTop: 2 },
    actionsBar: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    searchContainer: {
      flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardDark,
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, height: 38, paddingHorizontal: 10,
    },
    searchInput: { flex: 1, fontSize: 13, fontFamily: fonts.serif, color: colors.textMain, padding: 0 } as any,
    markAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accentYellow, paddingHorizontal: 12, height: 38, borderRadius: radius.sm },
    markAllBtnText: { fontSize: 11.5, fontFamily: fonts.serif, fontWeight: '700', color: '#241f16' },
    emptyContainer: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted },
    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.sm,
      borderWidth: 1, borderColor: colors.accentRed, backgroundColor: `${colors.accentRed}12`,
    },
    errorText: { fontFamily: fonts.serif, fontSize: 13, color: colors.accentRed, flex: 1 },
    studentsListCard: { backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, overflow: 'hidden' },
    studentRow: { flexDirection: 'row', padding: 14, alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    studentInfoCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    studentAvatar: { width: 36, height: 36, borderRadius: 8, backgroundColor: `${colors.accentYellow}22`, alignItems: 'center', justifyContent: 'center' },
    studentAvatarText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '800', color: colors.accentYellow },
    studentNameText: { fontFamily: fonts.serif, fontSize: 13.5, fontWeight: '700', color: colors.textHeading },
    studentEmailText: { fontFamily: fonts.serif, fontSize: 11, color: colors.textDim },
    attendanceButtonsCol: { flexDirection: 'row', gap: 6 },
    attendanceButton: {
      flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.borderColor,
      paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.sm, minWidth: 46, justifyContent: 'center',
    },
    attendanceBtnLabel: { fontSize: 11, fontFamily: fonts.serif, color: colors.textMuted },
    // Compact, centred (not full width).
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', backgroundColor: colors.accentYellow,
      height: 44, paddingVertical: 0, paddingHorizontal: 24, borderRadius: 12, marginTop: 8,
    },
    saveBtnText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: '#241f16' },
    saveMessage: { fontFamily: fonts.serif, fontSize: 13, textAlign: 'center' },
  });
}
