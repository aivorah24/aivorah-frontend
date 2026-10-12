import { StyleSheet, Platform } from 'react-native';
import { spacing, radius } from '../../../theme';
import type { AppColors } from '../../../theme';

export const dialogStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, borderRadius: 16, borderWidth: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  hint: { fontSize: 12, marginBottom: 14, lineHeight: 17 },
  label: { fontSize: 11.5, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  submitBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
});

export const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 48, gap: spacing.lg },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: c.textDim, textAlign: 'center', fontWeight: '500' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: c.textMain, fontSize: 14 },

  tabsScroll: { marginHorizontal: -spacing.xl },
  tabs: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor,
    backgroundColor: c.cardDark,
  },
  tabActive: { backgroundColor: c.accentYellow + '18', borderColor: c.accentYellow },
  tabText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  tabTextActive: { color: c.accentYellow },
  tabBadge: {
    backgroundColor: c.accentRed, borderRadius: 8, width: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  empty: { alignItems: 'center', gap: 12, paddingTop: 40 },
  emptyText: { fontSize: 14, color: c.textDim },

  studentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  studentCard: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md,
    width: '49%',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cardInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: c.textMain },
  studentMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBarBg: { flex: 1, height: 6, backgroundColor: c.borderColor, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: '700', color: c.textMuted, width: 32, textAlign: 'right' },

  cardStats: { flexDirection: 'row', gap: spacing.lg },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatVal: { fontSize: 11, color: c.textMuted, fontWeight: '600' },

  // Add student button (below header)
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end',
    marginHorizontal: spacing.xl, marginBottom: 4,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.md, backgroundColor: c.accentYellow,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#0B0B0B' },

  promoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.md, backgroundColor: c.accentYellow,
  },
  promoteBtnText: { fontSize: 13, fontWeight: '700', color: '#0B0B0B' },
  promoteBtnActive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor,
  },
  promoteBtnActiveText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  promoteBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: spacing.xl, marginBottom: 8,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.md, backgroundColor: c.accentYellow + '12',
    borderWidth: 1, borderColor: c.accentYellow + '30',
  },
  promoteBarText: { fontSize: 12.5, fontWeight: '600', color: c.textMuted },
  promoteConfirmBtn: { backgroundColor: c.accentYellow, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 7 },
  promoteConfirmBtnText: { fontSize: 12.5, fontWeight: '700', color: '#0B0B0B' },
  studentCardSelected: { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '0D' },

  // Empty state add button
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    paddingHorizontal: spacing.xl, paddingVertical: 12,
    borderRadius: radius.md, backgroundColor: c.accentYellow,
  },
  emptyAddBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 480 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 17, fontWeight: '700', color: c.textMain },
  modalNote: { fontSize: 13, color: c.textMuted, lineHeight: 20, marginBottom: spacing.md },
  modalTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  modalTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: radius.md, borderWidth: 1,
    borderColor: c.borderColor, backgroundColor: 'transparent',
  },
  modalTabActive: { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '18' },
  modalTabText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  modalFieldLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 4 },
  modalInput: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, height: 46, paddingHorizontal: spacing.md,
  },
  modalTextInput: { flex: 1, fontSize: 14, color: c.textMain, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginTop: 4,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  modalSaveBtn: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: c.accentYellow, alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: 'white' },
});
