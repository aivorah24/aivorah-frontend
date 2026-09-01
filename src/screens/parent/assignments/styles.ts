import { StyleSheet } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

export const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 48 },

  childRow: { flexDirection: 'row', marginBottom: spacing.md },
  childTab: {
    alignItems: 'center', marginRight: spacing.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: radius.lg, borderWidth: 1, borderColor: 'transparent',
  },
  childTabActive: { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '18' },
  childTabName: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700' },
  childTabGrade: { fontFamily: fonts.serif, fontSize: 10, color: c.textDim, marginTop: 2 },

  glanceCard: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xl,
  },
  glanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  glanceTitle: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: c.textMain },
  glanceSub: { fontFamily: fonts.serif, fontSize: 12, color: c.textMuted, marginTop: 2 },
  childBadge: { backgroundColor: c.accentYellow + '18', borderWidth: 1, borderColor: c.accentYellow + '40', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  childBadgeText: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '600', color: c.accentYellow },
  glanceStats: { flexDirection: 'row' },
  glanceStat: { flex: 1, paddingHorizontal: spacing.md },
  glanceDivider: { width: 1, backgroundColor: c.borderColor },
  glanceStatLabel: { fontFamily: fonts.serif, fontSize: 11, color: c.textMuted, marginBottom: 4 },
  glanceStatValue: { fontFamily: fonts.serif, fontSize: 26, fontWeight: '700', color: c.textMain },
  glanceStatTotal: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '400', color: c.textMuted },
  glanceStatNote: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '600', marginTop: 4 },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, gap: spacing.md },
  filterTab: {
    paddingHorizontal: spacing.lg, paddingVertical: 10, marginRight: spacing.sm,
    borderRadius: radius.md, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
  },
  filterTabActive: { backgroundColor: c.accentYellow, borderColor: c.accentYellow },
  filterText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '500', color: c.textMuted },
  filterTextActive: { color: '#0B0B0B' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accentYellow, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: 999 },
  newBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },

  sectionLabel: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: c.textDim, letterSpacing: 0.8, marginBottom: spacing.md, textTransform: 'uppercase' },

  assignmentList: {
    // 2-column grid on wide screens; collapses to a single column on narrow ones
    // (each card has a minWidth, so <2 fit → they wrap to one per row).
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  assignmentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14,
    // width is set inline (48.5% for 2-col, 100% for 1-col) so the last odd card
    // stays half-width instead of stretching across the row.
  },
  assignmentIconSm: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  assignmentTitle: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: c.textMain },
  statusPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '600' },
  assignmentMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assignmentDue: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '500', marginRight: 8 },
  assignmentTime: { fontFamily: fonts.serif, fontSize: 11, color: c.textMuted },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: spacing.md },
  emptyText: { fontFamily: fonts.serif, fontSize: 14, color: c.textDim },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  emptyAddText: { fontFamily: fonts.serif, fontSize: 13, color: c.accentYellow, fontWeight: '600' },

  // Modal
  // Centered, width-capped modal — compact like the Teacher Assignment modal
  // (was a full-width bottom sheet that sprawled across desktop).
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalSheet: {
    backgroundColor: c.cardDark, borderRadius: 24,
    maxHeight: '90%', borderWidth: 1, borderColor: c.borderColor,
    width: '100%', maxWidth: 560, alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: c.borderColor,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: 18, fontWeight: '800', color: c.textMain },
  modalSub: { fontFamily: fonts.serif, fontSize: 12, color: c.textMuted, marginTop: 2 },
  modalContent: { padding: spacing.xl, gap: spacing.md, paddingBottom: 40 },

  fieldLabel: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12,
    color: c.textMain, fontFamily: fonts.serif, fontSize: 14,
  },
  inputMulti: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md,
    borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark,
  },
  chipText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: c.textMuted },
  infoNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.accentGreen + '12', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: c.accentGreen + '30',
  },
  infoNoteText: { fontFamily: fonts.serif, fontSize: 12, color: c.textMuted, flex: 1 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.accentRed + '14', borderWidth: 1, borderColor: c.accentRed + '40',
    borderRadius: radius.sm, padding: spacing.md,
  },
  errorText: { fontFamily: fonts.serif, fontSize: 12, color: c.accentRed, flex: 1 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.accentYellow, padding: 16, borderRadius: 999, marginTop: spacing.sm,
  },
  submitBtnText: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: '#0B0B0B' },

  // Topic picker grid
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  topicChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark,
    maxWidth: '48%',
  },
  topicChipText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '500', color: c.textMuted },

  // AI inline panel (teacher-style)
  aiPanel: {
    padding: 14, borderRadius: 14, borderWidth: 1.5,
    borderColor: c.accentYellow + '40', backgroundColor: c.accentYellow + '18', gap: 2,
  },
  aiPanelTitle: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '800', color: c.accentYellow },
  aiPanelSub: { fontFamily: fonts.serif, fontSize: 11, color: c.textDim, lineHeight: 17 },
  aiGenerateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: 14, borderRadius: 12, marginTop: 10,
  },
});
