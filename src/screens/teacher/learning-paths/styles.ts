import { StyleSheet } from 'react-native';
import { spacing, radius } from '../../../theme';
import type { AppColors } from '../../../theme';


export const makeStyles = (c: AppColors) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: c.bgDark },
  scroll:   { flex: 1 },
  content:  { padding: spacing.xl, paddingBottom: 48, gap: spacing.xl, maxWidth: 1280, width: '100%', alignSelf: 'center' },

  heroBanner: {
    flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden',
    backgroundColor: c.cardDark,
    borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.xxxl,
    alignItems: 'stretch', gap: spacing.xxxl,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 22, shadowOffset: { width: 0, height: 12 },
  },
  heroCopy: { flex: 1, minWidth: 300, gap: spacing.lg, justifyContent: 'center', maxWidth: 860 },
  heroPill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.accentYellow + '12', borderWidth: 1, borderColor: c.accentYellow + '30',
    borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  heroPillText: {
    fontSize: 12, fontWeight: '800', color: c.accentYellow,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 40, fontWeight: '700', color: c.textHeading,
    lineHeight: 46, letterSpacing: -0.2, maxWidth: 650,
  },
  titleRule: { width: 112, height: 3, backgroundColor: c.accentYellow, borderRadius: 99 },
  heroSub: { fontSize: 15, color: c.textMuted, lineHeight: 24, maxWidth: 720 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  statCard: {
    minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, padding: spacing.lg,
  },
  statIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: c.accentYellow + '16',
    alignItems: 'center', justifyContent: 'center',
  },
  statNumber: { fontSize: 26, fontWeight: '800', color: c.textHeading, lineHeight: 30 },
  statLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  videoSectionHead: { alignItems: 'center', gap: 8, alignSelf: 'center', maxWidth: 760, marginTop: spacing.sm },
  sectionKicker: {
    fontSize: 12, fontWeight: '800', color: c.accentYellow,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  sectionHeadline: { fontSize: 30, fontWeight: '800', color: c.textHeading, textAlign: 'center', lineHeight: 36 },
  sectionHeadSub: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
  videoSection: {
    backgroundColor: c.cardDark,
    borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.xxxl, gap: spacing.xl,
  },
  videoGridReverse: { flexDirection: 'row-reverse' },
  videoIntro: { alignItems: 'center', gap: 8, alignSelf: 'center', maxWidth: 760 },
  videoEyebrow: {
    fontSize: 12, fontWeight: '800', color: c.accentYellow,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  videoTitle: { fontSize: 28, fontWeight: '800', color: c.textHeading, textAlign: 'center', lineHeight: 34 },
  videoDesc: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
  videoGrid: { flexDirection: 'row', gap: spacing.xl, alignItems: 'stretch' },
  videoGridStack: { flexDirection: 'column' },
  videoPlayerPanel: {
    flex: 1.25, minWidth: 280,
    borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: '#050505',
    borderWidth: 1, borderColor: c.borderColor,
  },
  nativeVideoFallback: {
    aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: '#050505',
  },
  nativeVideoText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  videoSidePanel: {
    flex: 0.85, minWidth: 270,
    backgroundColor: c.bgDark,
    borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg,
  },
  panelTitle: { fontSize: 16, fontWeight: '800', color: c.textHeading },
  outcomeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  outcomeIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: c.accentYellow + '12',
    borderWidth: 1, borderColor: c.accentYellow + '28',
    alignItems: 'center', justifyContent: 'center',
  },
  outcomeTitle: { fontSize: 13, fontWeight: '800', color: c.textHeading, textTransform: 'capitalize' },
  outcomeDesc: { fontSize: 12, color: c.textMuted, lineHeight: 18, marginTop: 2 },

  overviewGrid: { flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' },
  overviewGridStack: { flexDirection: 'column' },
  coursePanel: {
    flex: 1.6, width: '100%',
    backgroundColor: c.cardDark,
    borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.xl,
  },
  sectionHead: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: c.textHeading },
  sectionSub: { fontSize: 12, color: c.textMuted, marginTop: 6 },
  pathList: { gap: spacing.sm },
  pathCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, padding: spacing.lg,
  },
  pathCardActive: {
    borderColor: c.accentYellow + '45',
    backgroundColor: c.accentYellow + '08',
  },
  pathStep: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: c.cardHover,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  pathStepActive: { backgroundColor: c.accentYellow },
  pathStepText: { fontSize: 13, fontWeight: '800', color: c.textMuted },
  pathStepTextActive: { color: c.cardDark },
  pathInfo: { flex: 1, gap: 4 },
  pathLabel: { fontSize: 14, fontWeight: '800', color: c.textHeading },
  pathDesc: { fontSize: 12.5, color: c.textMuted, lineHeight: 18 },
  pathMeta: { fontSize: 11, color: c.accentYellow, fontWeight: '800', marginTop: 2 },
  pathAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sideColumn: { flex: 0.75, width: '100%', gap: spacing.md, minWidth: 280 },
  progressPanel: {
    backgroundColor: c.cardDark,
    borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg,
  },
  progressCircle: {
    alignSelf: 'center', width: 118, height: 118, borderRadius: 59,
    borderWidth: 8, borderColor: c.accentYellow + '24',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.bgDark,
  },
  progressValue: { fontSize: 24, fontWeight: '800', color: c.textHeading },
  progressLabel: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  progressMetaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: c.borderColor, paddingTop: spacing.sm,
  },
  progressMetaLabel: { fontSize: 12, color: c.textMuted },
  progressMetaValue: { fontSize: 12, color: c.textHeading, fontWeight: '800' },
  primaryButton: {
    minHeight: 44, borderRadius: radius.md,
    backgroundColor: c.textMain,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: spacing.sm,
  },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  benefitsPanel: {
    backgroundColor: c.cardDark,
    borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  benefitIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: c.accentYellow + '12',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  benefitText: { flex: 1, fontSize: 12.5, color: c.textMuted, lineHeight: 18 },

  // Modal — a compact centered card, not an edge-to-edge bottom sheet, so it
  // doesn't dominate the whole viewport on wide (web/tablet) screens.
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalSheet: {
    backgroundColor: c.bgDark, borderRadius: radius.xl,
    width: '100%', maxWidth: 640, maxHeight: '85%', borderWidth: 1, borderColor: c.borderColor,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: c.borderColor,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: c.textHeading },
  modalSub:   { fontSize: 13, color: c.textMuted, marginTop: 3 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: c.cardHover,
    alignItems: 'center', justifyContent: 'center',
  },

  lessonCard: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm,
  },
  lessonHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lessonNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: c.accentYellow + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  lessonNumText: { fontSize: 12, fontWeight: '700', color: c.accentYellow },
  lessonTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: c.textHeading },
  minPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  minText: { fontSize: 11, color: c.textDim },
  videoPlaceholder: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: c.cardHover, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, padding: spacing.md,
  },
  videoPlaceholderText: { fontSize: 13, color: c.textMuted, fontWeight: '500' },
  lessonBody: { fontSize: 13.5, color: c.textMuted, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletText: { flex: 1, fontSize: 13, color: c.textMuted, lineHeight: 19 },
  promptsLabel: {
    fontSize: 12, fontWeight: '700', color: c.textDim,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  promptBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: c.cardHover, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, padding: spacing.md,
  },
  promptText: { flex: 1, fontSize: 12.5, color: c.textMuted, lineHeight: 18 },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4,
    backgroundColor: c.accentYellow + '12', borderWidth: 1, borderColor: c.accentYellow + '30',
    borderRadius: radius.md, padding: spacing.md,
  },
  tipText: { flex: 1, fontSize: 13, color: c.accentYellow, lineHeight: 19, fontWeight: '500' },
});
