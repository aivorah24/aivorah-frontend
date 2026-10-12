import { StyleSheet } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

export function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 1100, alignSelf: 'center' },

    // Summary strip (matches Students/Bulk Import KPI pattern)
    summaryStrip: {
      flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 20, gap: 14,
    },
    summaryCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    summaryIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    summaryLabel: { fontSize: 11, color: colors.textDim, marginBottom: 2 },
    summaryValue: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '800', color: colors.textHeading },
    summaryDivider: { width: 1, height: 28, backgroundColor: colors.borderColor },

    selectionBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      backgroundColor: colors.accentYellow + '12', borderWidth: 1, borderColor: colors.accentYellow + '30',
      borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
    },
    selectionBarText: { fontSize: 12.5, color: colors.textMain, fontWeight: '600' },
    selectionBarClear: { fontSize: 12, color: colors.accentYellow, fontWeight: '700' },

    cardTitleRow: { marginBottom: 14 },
    cardSubtitle: { fontSize: 11.5, color: colors.textDim, marginTop: 2 },

    toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },

    // Search row — search box + selected count, Students-page style
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, flexGrow: 1, minWidth: 220, maxWidth: 420,
      height: 36, paddingHorizontal: 12, borderRadius: radius.sm,
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.textMain },
    selectedCount: { fontSize: 12, color: colors.textDim, marginLeft: 'auto' as any },

    // Grade / School / Status single-select dropdowns
    filterRow: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },

    // Active filter chips (removable) + result count
    chipsLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    activeChips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    activeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
      backgroundColor: colors.accentYellow + '18', borderWidth: 1, borderColor: colors.accentYellow + '40',
    },
    activeChipText: { fontSize: 11.5, color: colors.textMain, fontWeight: '600' },
    clearAllText: { fontSize: 12, color: colors.accentYellow, fontWeight: '700' },
    resultCount: { fontSize: 12, color: colors.textDim },

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
    tableRowSelected: { backgroundColor: colors.accentYellow + '1A' },
    tableCell: { flex: 1, fontSize: 13, color: colors.textMain, fontFamily: fonts.sans },
    // borderColor token is a faint rgba — use the hex textDim so unchecked boxes stay clearly visible.
    checkbox: {
      width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.textDim,
      backgroundColor: colors.cardDark, alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    checkboxChecked: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
    emptyRowText: { fontSize: 12.5, color: colors.textDim, paddingVertical: 20, textAlign: 'center' },

    // Paginated student roster (avatar + name/email, sortable columns, status pill)
    roster: { borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, overflow: 'hidden' },
    // Header and body rows share rosterCell, so padding and widths line up
    // column-for-column. Rows stretch cells to full height (dividers run the
    // whole row); each cell centres its own content vertically.
    rosterHeadRow: {
      flexDirection: 'row', alignItems: 'stretch', minHeight: 44,
      // borderColor is rgba() in both themes, so tint from a hex token instead of appending alpha to it.
      backgroundColor: colors.textHeading + '17', borderBottomWidth: 1.5, borderBottomColor: colors.borderColor,
    },
    rosterHeadText: { fontSize: 12, fontWeight: '800', color: colors.textMain, letterSpacing: 0.2 },
    rosterSortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
    rosterCheckCell: { width: 48, alignItems: 'center', justifyContent: 'center' },
    rosterCell: {
      minWidth: 0, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center',
      borderLeftWidth: 1, borderLeftColor: colors.borderColor,
    },
    rosterCellText: { fontSize: 13, color: colors.textMain, fontFamily: fonts.sans },
    rosterDash: { alignSelf: 'stretch', textAlign: 'center', color: colors.textDim },
    rosterRow: {
      flexDirection: 'row', alignItems: 'stretch', minHeight: 60,
      borderBottomWidth: 1, borderBottomColor: colors.borderColor,
    },
    rosterRowAlt: { backgroundColor: colors.bgDark + '80' },
    rosterStudentCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rosterAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    rosterAvatarText: { fontSize: 11.5, fontWeight: '700' },
    rosterName: { fontSize: 13, fontWeight: '700', color: colors.textHeading },
    rosterEmail: { fontSize: 11.5, color: colors.textDim, marginTop: 2 },
    rosterTeacherText: { fontSize: 12, fontWeight: '600', color: colors.textMain },
    assignedTeacherLine: { gap: 3 },
    assignedSubjects: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    assignedSubjectPill: {
      paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full,
      backgroundColor: colors.accentBlue + '18', borderWidth: 1, borderColor: colors.accentBlue + '35',
    },
    assignedSubjectText: { fontSize: 10.5, fontWeight: '600', color: colors.accentBlue },
    rosterFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
    rosterPager: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pagerBtn: {
      width: 32, height: 32, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardDark,
    },

    // Teacher picker: search + "show all" toggle, chip list scrolls when long
    teacherSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' },
    teacherList: {
      marginTop: 10, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, overflow: 'hidden',
    },
    teacherListScroll: { height: 360 },

    // Assign card: step 1 (teacher) left, step 2 (subjects + summary + action) right; stacks when narrow
    assignHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
    assignTitle: { fontFamily: fonts.serif, fontSize: 20, fontWeight: '800', color: colors.textHeading },
    countBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: radius.full, backgroundColor: colors.accentYellow + '1A', borderWidth: 1, borderColor: colors.accentYellow + '40',
    },
    countBadgeText: { fontSize: 11.5, fontWeight: '700', color: colors.accentYellow },
    assignColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
    assignColTeacher: { flexGrow: 3, flexBasis: 420, minWidth: 300 },
    assignColSubjects: { flexGrow: 2, flexBasis: 340, minWidth: 280 },
    stepPanel: {
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, padding: 16, backgroundColor: colors.cardDark,
    },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    stepNum: {
      width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.accentYellow + '1F',
    },
    stepNumActive: { backgroundColor: colors.accentYellow },
    stepNumText: { fontSize: 12.5, fontWeight: '800', color: colors.accentYellow },
    stepNumTextActive: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' },
    stepTitle: { fontSize: 15, fontWeight: '800', color: colors.textHeading },
    stepMeta: { fontSize: 11.5, color: colors.textDim, marginLeft: 'auto' as any },

    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    switchTrack: {
      width: 34, height: 20, borderRadius: 10, padding: 2, justifyContent: 'center',
      backgroundColor: colors.borderColor,
    },
    switchTrackOn: { backgroundColor: colors.accentYellow },
    switchKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF' },
    switchKnobOn: { alignSelf: 'flex-end' },
    switchLabel: { fontSize: 12, color: colors.textMain },

    teacherSchool: { flex: 1.3, fontSize: 12, color: colors.textMuted },

    selectedTeacherHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    subLabel: { fontSize: 12, fontWeight: '700', color: colors.textMain },
    changeLink: { fontSize: 12, fontWeight: '700', color: colors.accentBlue, textDecorationLine: 'underline' },
    selectedTeacherCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
      borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark,
    },
    selectedTeacherCardOn: { borderColor: colors.accentYellow + '60', backgroundColor: colors.accentYellow + '12' },

    subjectChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark,
    },
    subjectChipOn: { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '14' },
    subjectCheck: {
      width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.borderColor,
      alignItems: 'center', justifyContent: 'center',
    },
    subjectCheckOn: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
    subjectChipText: { fontSize: 12.5, color: colors.textMain },
    subjectChipTextOn: { fontWeight: '700' },

    summaryBox: {
      marginTop: 16, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm,
      backgroundColor: colors.bgDark, paddingHorizontal: 12, paddingBottom: 4,
    },
    summaryBoxHead: {
      flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.borderColor,
    },
    summaryBoxTitle: { fontSize: 12.5, fontWeight: '800', color: colors.textHeading },
    summaryLine: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 9,
      borderBottomWidth: 1, borderBottomColor: colors.borderColor,
    },
    summaryKey: { fontSize: 12, color: colors.textMuted },
    summaryVal: { fontSize: 12, fontWeight: '700', color: colors.textHeading },
    miniChip: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
      backgroundColor: colors.accentYellow + '1A', borderWidth: 1, borderColor: colors.accentYellow + '40',
    },
    miniChipText: { fontSize: 10.5, fontWeight: '700', color: colors.accentYellow },

    infoNote: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10,
      borderRadius: radius.sm, backgroundColor: colors.accentBlue + '14', borderWidth: 1, borderColor: colors.accentBlue + '30',
    },
    infoNoteText: { flex: 1, fontSize: 11.5, color: colors.textMain },
    teacherRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11,
      borderBottomWidth: 1, borderBottomColor: colors.borderColor, backgroundColor: colors.cardDark,
    },
    teacherRowActive: { backgroundColor: colors.accentYellow + '14', borderWidth: 1, borderColor: colors.accentYellow + '80' },
    radio: {
      width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.borderColor,
      alignItems: 'center', justifyContent: 'center',
    },
    radioActive: { borderColor: colors.accentYellow },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentYellow },
    teacherAvatar: {
      width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.accentBlue + '22',
    },
    teacherAvatarText: { fontSize: 11, fontWeight: '700', color: colors.accentBlue },
    teacherTeaches: { width: 104, fontSize: 11.5, color: colors.textDim, textAlign: 'right' },

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
      paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.cardDark,
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

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingVertical: 12,
      alignSelf: 'center', marginTop: 18, minWidth: 180, paddingHorizontal: 32,
    },
    submitBtnText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: '#0B0B0B' },

    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 360 },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor },
    retryText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
  });
}
