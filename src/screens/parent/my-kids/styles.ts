import { StyleSheet } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

export const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 48 },

  pageTitle: { fontSize: 22, fontWeight: '700', fontFamily: fonts.serif, color: c.textMain, marginBottom: 6 },
  pageSubtitle: { fontSize: 13, color: c.textMuted },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  addChildBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: c.accentYellow,
  },
  addChildBtnTxt: { fontSize: 14, fontWeight: '700', color: '#0B0B0B' },

  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'flex-start' },

  childCard: {
    flex: 1, minWidth: 280, maxWidth: 380,
    backgroundColor: c.cardDark, borderWidth: 1,
    borderColor: c.borderColor, borderRadius: radius.xl,
    padding: spacing.xl, gap: spacing.lg,
  },
  childCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 22, fontWeight: '700' },
  childName: { fontSize: 16, fontWeight: '700', fontFamily: fonts.serif, color: c.textMain },
  childSub: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', backgroundColor: c.bgDark,
    borderRadius: radius.lg, borderWidth: 1, borderColor: c.borderColor, overflow: 'hidden',
  },
  statBox: { flex: 1, padding: spacing.md, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: c.borderColor },
  statLabel: { fontSize: 11, color: c.textMuted, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: c.textMain },

  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  quickNav: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.accentYellow + '12', borderWidth: 1,
    borderColor: c.accentYellow + '35', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  quickBtnText: { fontSize: 12, fontWeight: '600' },

  recentSection: { gap: 8, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.borderColor },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityText: { fontSize: 12, color: c.textMuted, flex: 1 },

  emptyState: { flex: 1, minWidth: 280, alignItems: 'center', paddingVertical: 48, gap: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: c.textMain },
  emptySub: { fontSize: 13, color: c.textMuted, textAlign: 'center', maxWidth: 260 },

  addChildCard: {
    flex: 1, minWidth: 200,
    backgroundColor: c.cardDark, borderWidth: 1,
    borderColor: c.borderColor, borderStyle: 'dashed',
    borderRadius: radius.xl, padding: spacing.xxl,
    alignItems: 'center', justifyContent: 'center', gap: spacing.md,
  },
  addChildTitle: { fontSize: 16, fontWeight: '700', color: c.textMain, textAlign: 'center' },
  addChildSub: { fontSize: 12, color: c.textMuted, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox: {
    width: '100%', maxWidth: 420,
    backgroundColor: c.cardDark, borderRadius: 20,
    borderWidth: 1, borderColor: c.accentYellow + '30', padding: spacing.xl, gap: spacing.lg,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', fontFamily: fonts.serif, color: c.textMain },
  modalDesc: { fontSize: 13, color: c.textMuted, lineHeight: 20 },
  input: {
    borderWidth: 1, borderColor: c.accentYellow + '25', borderRadius: 12,
    padding: spacing.md, fontSize: 14, color: c.textMain,
    backgroundColor: c.bgDark,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontSize: 12, flex: 1 },
  linkBtn: {
    backgroundColor: c.accentYellow, borderRadius: 999,
    paddingVertical: 13, paddingHorizontal: spacing.md,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  linkBtnText: { fontSize: 15, fontWeight: '700', color: '#0B0B0B' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: c.accentYellow + '30', backgroundColor: c.bgDark },
  chipText: { fontSize: 12, fontWeight: '600', color: c.textMuted },

  // Tab switcher — pill style matching card nav buttons
  tabRow: { flexDirection: 'row', backgroundColor: c.bgDark, borderRadius: 999, borderWidth: 1, borderColor: c.accentYellow + '25', padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 999 },
  tabActive: { backgroundColor: c.accentYellow + '18', borderWidth: 1, borderColor: c.accentYellow + '50' },
  tabText: { fontSize: 13, color: c.textMuted, fontWeight: '500' },

  // Inline picker sections
  rowInputs: { flexDirection: 'row', gap: 10 },
  pickerWrap: { paddingVertical: 10, backgroundColor: c.bgDark, borderColor: c.accentYellow + '25' },

  // Task modal
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.borderColor,
  },
  taskIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#B8860B15', alignItems: 'center', justifyContent: 'center',
  },
  taskLabel: { fontSize: 13, fontWeight: '600', color: c.textMain },
  taskCoinsText: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  iconChip: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark,
  },
  coinChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark,
  },
});
