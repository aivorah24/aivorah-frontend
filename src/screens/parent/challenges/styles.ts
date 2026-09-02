import { StyleSheet } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

export const makeStyles = (c: AppColors) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: c.bgDark },
  content:  { padding: spacing.xl, paddingBottom: 40, gap: spacing.lg },

  childRow:           { marginBottom: spacing.sm },
  childTab:           { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark, alignItems: 'center' },
  childTabActive:     { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '18' },
  childTabName:       { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: c.textMuted },
  childTabNameActive: { color: c.accentYellow },
  childTabGrade:      { fontFamily: fonts.serif, fontSize: 11, color: c.textDim, marginTop: 1 },
  childTabGradeActive:{ color: c.accentYellow + 'aa' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.lg, justifyContent: 'space-around',
  },
  statItem:    { alignItems: 'center', gap: 4, flexDirection: 'row' },
  statValue:   { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: c.textMain, marginLeft: 4 },
  statLabel:   { fontFamily: fonts.serif, fontSize: 11, color: c.textDim },
  statDivider: { width: 1, height: 24, backgroundColor: c.borderColor },

  leaderCTA: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg,
  },
  leaderCTATitle: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700' },
  leaderCTASub:   { fontFamily: fonts.serif, fontSize: 12, color: c.textDim, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionIcon:   { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sectionLabel:  { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: c.textMain },
  sectionDesc:   { fontFamily: fonts.serif, fontSize: 12, color: c.textDim, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText:  { fontFamily: fonts.serif, fontSize: 14, color: c.textDim, textAlign: 'center' },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    width: '48.5%' as any,
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm,
  },
  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle:     { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: c.textMain, flex: 1 },
  cardDesc:      { fontFamily: fonts.serif, fontSize: 12, color: c.textMuted, lineHeight: 18 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaChip:      { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  metaChipText:  { fontFamily: fonts.serif, fontSize: 10, fontWeight: '600' },
  xpChip:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  xpChipText:    { fontFamily: fonts.serif, fontSize: 11, fontWeight: '700' },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaItemText:  { fontFamily: fonts.serif, fontSize: 11, color: c.textDim },

  assignedBadge:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  assignedBadgeText: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '700' },

  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: c.accentYellow + '50', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 7, backgroundColor: c.accentYellow + '22',
  },
  assignBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: c.accentYellow },

  infoCard: {
    flexDirection: 'row', gap: 8, backgroundColor: c.accentYellow + '22',
    borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.accentYellow + '30',
  },
  infoText: { flex: 1, fontFamily: fonts.serif, fontSize: 12, color: c.textMuted, lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalBox: {
    backgroundColor: c.cardDark, borderRadius: radius.xl,
    padding: spacing.xl, width: '100%', maxWidth: 380,
    borderWidth: 1, borderColor: c.borderColor, gap: spacing.lg,
  },
  confirmTitle:    { fontFamily: fonts.serif, fontSize: 17, fontWeight: '800', color: c.textMain },
  confirmDesc:     { fontFamily: fonts.serif, fontSize: 14, color: c.textMuted, lineHeight: 20 },
  confirmMeta:     { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  confirmMetaText: { fontFamily: fonts.serif, fontSize: 12, color: c.textDim, fontWeight: '500' },
  dot:             { width: 3, height: 3, borderRadius: 2, backgroundColor: c.textDim },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.accentRed + '20', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: c.accentRed + '40',
  },
  errorText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', flex: 1 },

  confirmBtns:    { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.lg,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText:  { fontFamily: fonts.serif, fontSize: 14, fontWeight: '600', color: c.textMuted },
  confirmBtn: {
    flex: 1, backgroundColor: c.accentYellow, borderRadius: radius.lg,
    paddingVertical: 13, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmBtnText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: '#fff' },

  successIcon:  { alignItems: 'center' },
  successTitle: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '800', color: c.textMain, textAlign: 'center' },
  successSub:   { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  doneBtn: {
    backgroundColor: c.accentYellow, borderRadius: radius.lg,
    paddingVertical: 13, alignItems: 'center',
  },
  doneBtnText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: '#fff' },
});

export type ParentChallengesStyles = ReturnType<typeof makeStyles>;
