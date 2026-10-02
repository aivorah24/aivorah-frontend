import { StyleSheet } from 'react-native';
import type { AppColors } from '../../../../theme';

export function makeStyles(c: AppColors) {
  return StyleSheet.create({
    scrollPad: { padding: 20 },
    centerMessage: { alignItems: 'center', gap: 10, paddingVertical: 32 },
    centerMessageText: { fontSize: 14, textAlign: 'center', color: c.textMuted },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: c.accentYellow + '60' },

    // Pick
    pickContainer: { gap: 16 },
    heroCard: { alignItems: 'center', gap: 12, paddingVertical: 32, borderRadius: 20, borderWidth: 1, borderColor: c.borderColor, marginBottom: 4 },
    heroIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentYellow + '18', alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    heroSub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
    lexilePill: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: c.accentYellow + '18', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
    sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.borderColor },
    filterTabText: { fontSize: 13, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    gridCard: { width: '48.5%', borderRadius: 16, overflow: 'hidden', backgroundColor: c.cardDark, borderWidth: 1 },
    gridCardGradient: { height: 88, alignItems: 'center', justifyContent: 'center' },
    gridCardIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    gridCardBody: { padding: 14, gap: 6 },
    gridCardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
    gridCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    gridCardTopic: { fontSize: 11 },
    gridCardWords: { fontSize: 11, marginTop: 2 },
    levelPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
    levelPillText: { fontSize: 10, fontWeight: '700' },
    surpriseBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14,
      borderRadius: 14, borderWidth: 1, backgroundColor: c.accentYellow + '08', marginTop: 4,
    },

    // Calibration
    calibrationWrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
    calibrationCard: { borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', maxWidth: 500 },
    calibrationIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentYellow + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    calibrationTitle: { fontSize: 22, fontWeight: '800', color: c.textMain, textAlign: 'center', marginBottom: 8 },
    calibrationText: { fontSize: 14, color: c.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    calibrationLexile: { backgroundColor: c.accentYellow + '18', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16 },
    calibrationStart: { backgroundColor: c.accentYellow, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginBottom: 12 },

    // Passage preview
    idleContainer: { flex: 1, padding: 20 },
    passageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    passageTitleLarge: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    passageMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    textCard: { padding: 24, borderRadius: 16, backgroundColor: c.cardDark, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
    textCardGradientBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
    passageTextWrap: { flexWrap: 'wrap', flexDirection: 'row' },
    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, borderWidth: 1 },
    primaryBtn: { borderWidth: 0 },

    // Countdown
    countdownOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    countdownCircle: {
      width: 140, height: 140, borderRadius: 70, backgroundColor: c.accentYellow + '15',
      borderWidth: 3, borderColor: c.accentYellow + '40', alignItems: 'center', justifyContent: 'center',
    },
    countdownNum: { fontSize: 56, fontWeight: '900' },
    countdownHint: { fontSize: 16, marginTop: 16 },

    // Reading + preview
    readingContainer: { flex: 1 },
    readingScroll: { flex: 1, backgroundColor: c.bgDark },
    liveWordsWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 6 },
    liveWordSlot: { position: 'relative', marginBottom: 8, paddingLeft: 2 },
    liveCaret: { position: 'absolute', left: -2, top: 5, bottom: 5, width: 3, borderRadius: 2 },
    liveWord: { fontSize: 24, lineHeight: 34, paddingHorizontal: 3, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    recordingBar: { paddingHorizontal: 24, paddingVertical: 18, borderTopWidth: 1, alignItems: 'center' },
    waveformRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 44, marginBottom: 4 },
    recordingActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', maxWidth: 320, width: '100%' },
    recordingSecondaryBtn: {
      height: 48, minWidth: 104, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5,
    },
    recordingDoneBtn: {
      height: 50, minWidth: 116, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5,
    },
    recordingBtnText: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
    previewActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', maxWidth: 360, width: '100%' },
    previewSecondaryBtn: {
      height: 46, minWidth: 92, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5,
    },
    previewSubmitBtn: {
      height: 48, minWidth: 116, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5,
    },
    previewBtnText: { fontSize: 14, fontWeight: '700', lineHeight: 18 },

    // Review
    scoreCard: { alignItems: 'center', padding: 28, borderRadius: 20, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
    scoreRing: { width: 110, height: 110, borderRadius: 55, borderWidth: 5, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    scoreNum: { fontSize: 30, fontWeight: '900' },
    scoreLabel: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
    statsRow: { flexDirection: 'row', gap: 24 },
    statItem: { alignItems: 'center', gap: 4 },
    statNum: { fontSize: 20, fontWeight: '700' },
    statLabel: { fontSize: 11 },
    badgeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14, gap: 16 },
    badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
    feedbackCard: { flexDirection: 'row', gap: 12, padding: 18, borderRadius: 14, backgroundColor: c.cardDark, borderWidth: 1, alignItems: 'flex-start' },
    feedbackIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    feedbackText: { flex: 1, fontSize: 14, lineHeight: 22 },
    readingText: { flexWrap: 'wrap', flexDirection: 'row' },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1 },
    errorBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  });
}

export type ReadAloudStyles = ReturnType<typeof makeStyles>;
