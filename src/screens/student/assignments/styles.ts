import { StyleSheet } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

export const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xxl },
  statCard: {
    flex: 1, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden',
  },
  statLabel: { fontSize: 11, color: c.textMuted, fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  statIcon: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filtersScroll: { marginBottom: spacing.xxl },
  filterTab: { paddingHorizontal: spacing.lg, paddingVertical: 10, marginRight: spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterTabActive: { borderBottomColor: c.accentYellow },
  filterText: { fontSize: 13, fontWeight: '500', color: c.textMuted },
  filterTextActive: { color: c.textMain },
  sectionHeader: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textMain },
  sectionSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  // Outer wrapper — provides subject-colored border + tinted bg + left accent
  cardWrapper: {
    width: '48.5%',
    borderWidth: 1, borderRadius: radius.xl,
    overflow: 'hidden', flexDirection: 'row',
  },
  cardAccent: { width: 4 },
  // Inner card row
  card: {
    flex: 1, backgroundColor: 'transparent',
    padding: spacing.xl,
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
  },
  cardCompleted: { opacity: 0.88 },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: c.textMain, marginBottom: 3 },
  cardMeta: { fontSize: 12, color: c.textMuted },
  cardNote: { fontSize: 11, marginTop: 2 },
  feedbackPreview: { fontSize: 11, marginTop: 4, color: c.accentGreen, lineHeight: 16 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  dueRow: { flexDirection: 'row', alignItems: 'center' },
  dueText: { fontSize: 12, fontWeight: '500' },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  actionBtn: { height: 34, paddingHorizontal: spacing.md, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, minWidth: 64 },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
});

export const makeModalStyles = (c: AppColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: c.bgDark },
  sheet: { flex: 1, backgroundColor: c.bgDark },
  quizSheet: { flex: 1, backgroundColor: c.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, gap: spacing.md },
  subjectDot: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: c.textMain, fontFamily: fonts.serif },
  meta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  content: { padding: spacing.xl, paddingBottom: 48, gap: spacing.xl },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  noteBox: { flexDirection: 'row', gap: 8, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // Tasks list
  tasksList: { gap: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  taskNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  taskNumText: { fontSize: 11, fontWeight: '800' },
  taskText: { flex: 1, fontSize: 14, color: c.textMain, lineHeight: 22 },

  // Upload
  uploadSection: { gap: 8 },
  uploadHint: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  uploadBtn: {
    alignItems: 'center', justifyContent: 'center', gap: 12,
    borderWidth: 2, borderStyle: 'dashed', borderRadius: radius.xl,
    paddingVertical: 36, paddingHorizontal: spacing.xl,
  },
  uploadIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  uploadBtnTitle: { fontSize: 16, fontWeight: '700' },
  uploadBtnSub: { fontSize: 12 },
  previewWrap: { gap: 8 },
  photoPreview: { width: '100%', height: 240, borderRadius: radius.lg, backgroundColor: '#111' },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  changePhotoText: { fontSize: 13, fontWeight: '600' },

  // Submit
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: radius.lg },
  compactBtn: { paddingVertical: 12, paddingHorizontal: 18, minWidth: 140 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Results
  resultBox: { gap: spacing.lg },
  scoreBadge: { alignItems: 'center', padding: spacing.xxl, borderRadius: radius.xl, borderWidth: 1 },
  scoreNum: { fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  scoreLabel: { fontSize: 17, fontWeight: '700', marginTop: 6, fontFamily: fonts.serif },

  stampCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1 },
  stampIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stampLabel: { fontSize: 11, color: c.textDim, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  stampName: { fontSize: 16, fontWeight: '800', marginTop: 2, fontFamily: fonts.serif },

  feedbackCard: { backgroundColor: c.bgDark, borderRadius: radius.lg, padding: spacing.lg, gap: 6 },
  feedbackTitle: { fontSize: 11, fontWeight: '700', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.8 },
  feedbackText: { fontSize: 15, color: c.textMain, lineHeight: 24 },

  criteriaRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  criteriaLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  criteriaText: { fontSize: 13, lineHeight: 20 },

  // Question step
  questionCard: { borderWidth: 1.5, borderRadius: radius.xl, padding: spacing.xl, gap: 12 },
  qNumBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  qNumBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  questionText: { fontSize: 17, fontWeight: '700', color: c.textMain, lineHeight: 26, fontFamily: fonts.serif },

  // Review row
  qReviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: 10 },

  // Per-question breakdown
  qRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: 8 },
  qLeft: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  qNum: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  qText: { fontSize: 13, fontWeight: '600', color: c.textMain, lineHeight: 18, marginBottom: 3 },
  qComment: { fontSize: 12, lineHeight: 18 },
  qAnswer: { fontSize: 11, marginTop: 3, fontStyle: 'italic' },
  qScore: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignItems: 'center', justifyContent: 'center', minWidth: 44 },
  qScoreText: { fontSize: 13, fontWeight: '800' },
});
