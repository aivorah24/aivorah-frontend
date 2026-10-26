import { StyleSheet } from 'react-native';
import { spacing, radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';

export const makeStyles = (c: AppColors, isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { width: '100%', maxWidth: 480 },
  loadingText: { marginTop: 16, fontSize: 14, textAlign: 'center' },

  // Two-panel layout
  twoPanel: {
    flexDirection: 'row', width: '100%', maxWidth: 800,
    borderRadius: radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: c.borderColor,
    minHeight: 480,
  },
  leftPanel: {
    width: 200, flexShrink: 0,
    padding: spacing.xl, justifyContent: 'space-between',
  },
  leftTop: { gap: 10 },
  subjectIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  leftSubject: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  leftTopic: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  stepDots: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  stepDot: { height: 8, borderRadius: 4 },
  leftBottom: { gap: 6 },
  leftCounter: { fontSize: 42, fontWeight: '900', lineHeight: 46 },
  leftOf: { fontSize: 13, fontWeight: '600', marginTop: -6 },
  leftTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginTop: 4 },
  leftTypeTxt: { fontSize: 11, fontWeight: '800' },

  // Right panel
  rightPanel: { flex: 1, backgroundColor: c.cardDark },
  divider: { height: 1 },
  questionText: { fontSize: 17, fontWeight: '700', lineHeight: 27, padding: spacing.xl },

  // Keep these minimal for backward compat
  progressText: { fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  questionBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  questionBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },

  // Options — full-width rows within card, left-border accent when selected/correct
  optionsList: { gap: 0 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: spacing.xl, borderLeftWidth: 3 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  optionLetter: { fontSize: 13, fontWeight: '800', width: 16, flexShrink: 0 },
  optionLetterText: { fontSize: 11, fontWeight: '900' },
  optionText: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },

  // Hint
  hintBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, marginHorizontal: spacing.xl, marginVertical: 6, borderRadius: 9, borderWidth: 1 },
  hintBannerLabel: { fontSize: 10, fontWeight: '900', color: c.textMain, textTransform: 'uppercase', letterSpacing: 0.4 },
  hintBannerText: { fontSize: 13, fontWeight: '600', color: c.textMain, lineHeight: 18 },
  retryChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  retryChipText: { fontSize: 10, fontWeight: '700' },

  // Fill blank
  fillArea: { paddingHorizontal: spacing.xl, paddingTop: 4, paddingBottom: spacing.md, gap: 10 },
  fillInput: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 14 },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nudgeText: { fontSize: 13, fontWeight: '600' },
  fillResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  fillCorrectText: { fontSize: 14, fontWeight: '700', flex: 1 },
  checkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.lg, alignSelf: 'flex-start' },
  checkBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 9, borderWidth: 1 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Explanation + next
  explanationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  explanationText: { flex: 1, fontSize: 13, lineHeight: 20 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.lg, paddingVertical: 11, paddingHorizontal: 20, margin: spacing.lg, marginTop: 4, alignSelf: 'flex-end' },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  failBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  failBannerText: { fontSize: 13, fontWeight: '700', color: '#C98A8A' },
  resultScore: { fontSize: 64, fontWeight: '900', marginTop: 16 },
  resultLabel: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  resultMessage: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8, maxWidth: 320 },
  topicBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16 },
  topicBadgeText: { fontSize: 13, fontWeight: '700' },
  resultBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl, width: '100%' },
  retryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.lg, paddingVertical: 14 },
  retryBtnText: { fontSize: 14, fontWeight: '700' },
  doneBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, paddingVertical: 14 },
  doneBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Answer review
  reviewSection: { width: '100%', marginTop: 28 },
  reviewSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  reviewSectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  reviewSectionTitle: { fontSize: 15, fontWeight: '800' },
  reviewCard: { width: '100%', borderWidth: 1, borderLeftWidth: 3, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  reviewQNum: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  reviewAnswerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8 },
  reviewExplRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 12, borderTopWidth: 1 },
});
