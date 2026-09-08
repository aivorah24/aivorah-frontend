import { StyleSheet } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

const GOLD = '#D9A93E'; // Aivorah brand gold for leaderboard accents

export const makeStyles = (c: AppColors) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: c.bgDark },
  scroll:   { flex: 1 },
  content:  { padding: spacing.xl, paddingBottom: 48, gap: spacing.lg },

  toggle: {
    flexDirection: 'row', backgroundColor: c.cardDark,
    borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, overflow: 'hidden',
  },
  toggleBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11 },
  toggleActive:    { backgroundColor: c.accentYellow + '18' },
  toggleText:      { fontSize: 14, fontWeight: '600', color: c.textMuted },
  toggleTextActive:{ color: c.accentYellow },

  // Grade chips
  gradeChip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark },
  gradeChipActive:   { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '18' },
  gradeChipText:     { fontSize: 13, fontWeight: '600', color: c.textMuted },
  gradeChipTextActive:{ color: c.accentYellow },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: c.textMain },
  sectionSub:   { fontSize: 12, color: c.textDim, marginTop: -spacing.sm },

  emptyState:  { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText:   { fontSize: 14, color: c.textDim },

  // Challenge cards laid out in a responsive 2-column grid
  challengeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'stretch' },
  // Challenge card
  card: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, overflow: 'hidden', flexDirection: 'row',
    // flexGrow 0 → a lone card keeps the column (half) width instead of
    // stretching full-width; pairs sit two-up, wrapping to 1 col under 300px.
    flexGrow: 0, flexBasis: '48%', minWidth: 300,
  },
  cardAccent: { width: 4 },
  cardBody:   { flex: 1, padding: spacing.lg, gap: spacing.sm },
  badgesRow:  { flexDirection: 'row', gap: 6 },
  categoryBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  categoryBadgeText: { fontSize: 10, fontWeight: '700' },
  diffBadge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  diffBadgeText:{ fontSize: 10, fontWeight: '700' },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: c.textMain },
  cardDesc:    { fontSize: 12, color: c.textMuted, lineHeight: 18 },
  statsRow:    { flexDirection: 'row', gap: spacing.lg },
  statItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText:    { fontSize: 12, color: c.textDim, fontWeight: '500' },

  assignRowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: c.accentYellow + '50', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 7, backgroundColor: c.accentYellow + '18',
  },
  assignRowBtnText: { fontSize: 13, fontWeight: '600', color: c.accentYellow },

  // Leaderboard
  leaderCard: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, overflow: 'hidden',
    // Cap to a focused reading width + center, so rows aren't stretched across
    // the full ultra-wide screen with a cavernous gap between name and score.
    width: '100%', maxWidth: 820, alignSelf: 'center',
  },
  leaderHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.borderColor,
  },
  leaderTitle:  { fontSize: 14, fontWeight: '700', color: c.textMain, flex: 1 },
  leaderPeriod: { fontSize: 11, color: c.textDim, fontWeight: '600' },
  leaderRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  leaderBorder: { borderBottomWidth: 1, borderBottomColor: c.borderColor },
  rankBadge:    { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankNum:      { fontSize: 13, fontWeight: '800', color: c.textMuted },
  leaderAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  leaderInitials:{ fontSize: 13, fontWeight: '800' },
  leaderInfo:   { flex: 1 },
  leaderName:   { fontSize: 14, fontWeight: '600', color: c.textMain },
  leaderGrade:  { fontSize: 11, color: c.textDim, marginTop: 2 },
  leaderRight:  { alignItems: 'flex-end' },
  leaderScore:  { fontSize: 15, fontWeight: '800', color: c.textMain },
  xpRow:        { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  xpLabel:      { fontSize: 10, fontWeight: '600' },

  // ── Leaderboard redesign ──
  lbWrap:        { width: '100%', maxWidth: 1180, alignSelf: 'center', gap: spacing.lg },
  statRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard:      { flexGrow: 1, flexBasis: '22%', minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: 12,
                   backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.lg },
  statIcon:      { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue:     { fontSize: 22, fontWeight: '800', color: c.textMain },
  statLabel:     { fontSize: 12, color: c.textDim, marginTop: 1 },

  panel:         { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.lg },
  panelHeadRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle:    { fontSize: 15, fontWeight: '700', color: c.textMain, flex: 1 },
  periodChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  periodChipText:{ fontSize: 12, color: c.textMuted, fontWeight: '600' },

  podiumRow:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.lg, paddingTop: 22 },
  podiumCard:    { flexGrow: 1, flexBasis: 0, maxWidth: 300, minWidth: 150, alignItems: 'center', borderWidth: 1, borderRadius: radius.xl,
                   paddingTop: 32, paddingBottom: spacing.lg, paddingHorizontal: spacing.md, gap: 3, overflow: 'visible' },
  podiumCardTop: { paddingTop: 44, paddingBottom: spacing.xl, borderWidth: 1.5 },
  podiumBadge:   { position: 'absolute', top: -16, alignSelf: 'center', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  podiumBadgeNum:{ fontSize: 13, fontWeight: '800', color: '#fff' },
  podiumAvatar:  { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 4 },
  podiumInitials:{ fontSize: 15, fontWeight: '800' },
  podiumName:    { fontSize: 14, fontWeight: '700', color: c.textMain, textAlign: 'center' },
  podiumGrade:   { fontSize: 11, color: c.textDim },
  podiumXP:      { fontSize: 17, fontWeight: '800', color: c.textMain, marginTop: 4 },
  podiumXPUnit:  { fontSize: 11, fontWeight: '700', color: c.textDim },

  lbBottomRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'flex-start' },
  lbTablePanel:  { flexGrow: 3, flexBasis: 520, minWidth: 300, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, overflow: 'hidden' },
  lbSideCol:     { flexGrow: 1, flexBasis: 280, minWidth: 260, gap: spacing.lg },
  lbPanelHead:   { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.borderColor },

  colHeadRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.borderColor },
  colHead:       { fontSize: 11, fontWeight: '700', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.3 },
  colRankW:      { width: 46 },
  colGradeHead:  { width: 54, textAlign: 'center' },
  colXPHead:     { width: 92, textAlign: 'right' },
  colChangeHead: { width: 64, textAlign: 'right' },
  colXPCell:     { width: 92, alignItems: 'flex-end' },
  colChangeCell: { width: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },

  tableRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 10 },
  tableRowBorder:{ borderBottomWidth: 1, borderBottomColor: c.borderColor },
  rankPill:      { width: 28, height: 28, borderRadius: 8, backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center' },
  rankPillText:  { fontSize: 12, fontWeight: '800', color: c.textMuted },
  cellStudent:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 },
  tableAvatar:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tableInitials: { fontSize: 12, fontWeight: '800' },
  tableName:     { fontSize: 14, fontWeight: '600', color: c.textMain },
  tableSub:      { fontSize: 11, color: c.textDim, marginTop: 1 },
  cellGrade:     { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  cellXP:        { fontSize: 14, fontWeight: '800', color: c.textMain },
  cellXPUnit:    { fontSize: 10, fontWeight: '700', color: c.textDim },
  changeText:    { fontSize: 12, fontWeight: '700' },
  viewFullBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderTopWidth: 1, borderTopColor: c.borderColor },
  viewFullText:  { fontSize: 13, fontWeight: '700', color: c.accentYellow },

  sideCard:      { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.lg, gap: 6 },
  yourRankNum:   { fontSize: 30, fontWeight: '900', color: GOLD, marginTop: 2 },
  yourRankName:  { fontSize: 14, fontWeight: '700', color: c.textMain },
  yourRankXP:    { fontSize: 14, fontWeight: '800', color: GOLD },
  yourRankDelta: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor, overflow: 'hidden', marginTop: 8 },
  progressFill:  { height: '100%', backgroundColor: GOLD, borderRadius: 4 },
  progressLabel: { fontSize: 11, color: c.textMuted, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  progressSub:   { fontSize: 10, color: c.textDim, textAlign: 'center' },
  weekLabels:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 },
  weekLabel:     { fontSize: 10, color: c.textDim, fontWeight: '600' },

  // Assign modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    backgroundColor: c.cardDark, borderRadius: 24,
    padding: spacing.xl, paddingBottom: 28, gap: spacing.lg,
    borderWidth: 1, borderColor: c.borderColor, maxHeight: '88%',
    width: '100%', maxWidth: 460, alignSelf: 'center',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: c.borderColor,
    alignSelf: 'center', marginBottom: spacing.sm,
  },
  modalHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  modalTitle:     { fontSize: 17, fontWeight: '800', color: c.textMain },
  modalSubtitle:  { fontSize: 13, color: c.textDim, marginTop: 2 },

  pickerLabel:    { fontSize: 13, fontWeight: '700', color: c.textMain },
  searchInput: {
    borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    fontSize: 14, color: c.textMain, backgroundColor: c.bgDark,
  },
  studentList:    { maxHeight: 180, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.md, overflow: 'hidden' },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: c.borderColor,
  },
  studentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: c.accentYellow + '20', alignItems: 'center', justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 12, fontWeight: '800', color: c.accentYellow },
  studentName:    { fontSize: 14, fontWeight: '600', color: c.textMain },
  studentGrade:   { fontSize: 11, color: c.textDim },
  noStudents:     { padding: spacing.lg, fontSize: 13, color: c.textDim, textAlign: 'center' },

  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: c.accentYellow + '50', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 11,
    backgroundColor: c.accentYellow + '18',
  },
  selectedChipName:  { fontSize: 14, fontWeight: '600', color: c.accentYellow, flex: 1 },
  selectedChipGrade: { fontSize: 11, color: c.accentYellow + 'aa' },

  assignBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.accentYellow, borderRadius: radius.lg, paddingVertical: 14,
  },
  assignBtnDisabled: { opacity: 0.45 },
  assignBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },

  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#10b98120', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: '#10b98140',
  },
  successText:  { fontSize: 13, fontWeight: '600', flex: 1 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ef444420', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: '#ef444440',
  },
  errorText:    { fontSize: 13, fontWeight: '600', flex: 1 },

  doneBtn: {
    backgroundColor: c.accentYellow, borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  doneBtnText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
});
