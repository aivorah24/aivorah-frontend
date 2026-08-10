import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, Animated, Platform, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { spacing, radius, fonts } from '../../../theme';
import { getPastelGradient } from './constants';
import { buildParagraphs } from './utils/textFormatting';
import { useStoryReader } from './hooks/useStoryReader';
import ReaderTopBar from './components/ReaderTopBar';
import ReaderPageVisual from './components/ReaderPageVisual';
import ReaderTextPanel from './components/ReaderTextPanel';
import ReaderControls from './components/ReaderControls';
import ReaderBottomNav from './components/ReaderBottomNav';
import SERVER_URL from '../../../config/bedtimeStoriesServerUrl';

export default function StoryReaderScreen({ route, navigation }: any) {
  const { storyId } = route.params ?? {};
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { width } = useWindowDimensions();
  const isWide = width >= 820;   // desktop / tablet-landscape → image-left, text-right

  const {
    story, loading, currentPage, voice, setVoice, isLoading, playing, autoPlay, setAutoPlay,
    wordIndex, donePages, playbackRate, setPlaybackRate, resumedFrom, setResumedFrom,
    fadeAnim, slideAnim, isPaused,
    pauseAudio, stopAudio, resumeAudio, speakPage, goToPage,
  } = useStoryReader(storyId);

  if (loading || !story) return (
    <ScreenLayout>
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#7BA8A4" />
        <Text style={[styles.hint, { color: colors.textMuted }]}>Opening story…</Text>
      </View>
    </ScreenLayout>
  );

  const page        = story.pages[currentPage];
  const isFirst     = currentPage === 0;
  const isLast      = currentPage === story.pages.length - 1;
  // Page art: each page shows ITS OWN scene-matched image (no repeated/cover fallback).
  // Resolves local /data/images paths against SERVER_URL; full http URLs pass through.
  const pageImg     = page.imageUrl ? (page.imageUrl.startsWith('http') ? page.imageUrl : `${SERVER_URL}${page.imageUrl}`) : null;
  const pastelGrad  = getPastelGradient(story.coverColor);
  const pastelAccent= pastelGrad[0];
  const paragraphs  = buildParagraphs(page.text);
  const isHighlightActive = playing || !!isPaused;
  const totalDone   = donePages.size;

  function backOut() {
    stopAudio();
    if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate('BhagavathaStories');
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>

        <ReaderTopBar
          story={story}
          currentPage={currentPage}
          pastelGrad={pastelGrad}
          pastelAccent={pastelAccent}
          donePages={donePages}
          resumedFrom={resumedFrom}
          setResumedFrom={setResumedFrom}
          totalDone={totalDone}
          onBack={backOut}
          onGoToPage={goToPage}
          textMain={colors.textMain}
          textDim={colors.textDim}
          cardDark={colors.cardDark}
          styles={styles}
        />

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, isWide && styles.spreadRow]}>

            <ReaderPageVisual
              page={page}
              pageImg={pageImg}
              pastelGrad={pastelGrad}
              pastelAccent={pastelAccent}
              currentPage={currentPage}
              totalPages={story.pages.length}
              isDone={donePages.has(page.pageNumber)}
              isWide={isWide}
              styles={styles}
            />

            <LinearGradient
              colors={isDark ? [pastelAccent + '1F', colors.cardDark] : [pastelAccent + '14', colors.cardDark]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={[styles.textCard, isWide && styles.textCardWide, { borderColor: pastelAccent + '2E' }]}
            >
              <ReaderTextPanel
                sceneIcon={page.sceneIcon}
                sceneLabel={page.sceneLabel}
                paragraphs={paragraphs}
                wordIndex={wordIndex}
                isHighlightActive={isHighlightActive}
                pastelAccent={pastelAccent}
                textMain={colors.textMain}
                textMuted={colors.textMuted}
                styles={styles}
              />

              <ReaderControls
                playing={playing}
                isPaused={!!isPaused}
                isLoading={isLoading}
                voice={voice}
                autoPlay={autoPlay}
                playbackRate={playbackRate}
                pastelAccent={pastelAccent}
                textDim={colors.textDim}
                borderColor={colors.borderColor}
                onListenPress={() => playing ? pauseAudio() : speakPage(page.pageNumber)}
                onVoiceChange={(v) => { stopAudio(); setVoice(v); }}
                onAutoToggle={() => { stopAudio(); setAutoPlay(p => !p); }}
                onRateChange={setPlaybackRate}
                styles={styles}
              />
            </LinearGradient>
          </Animated.View>
        </ScrollView>

        <ReaderBottomNav
          currentPage={currentPage}
          totalPages={story.pages.length}
          isFirst={isFirst}
          isLast={isLast}
          sceneLabel={page.sceneLabel}
          pastelAccent={pastelAccent}
          bgDark={colors.bgDark}
          cardDark={colors.cardDark}
          borderColor={colors.borderColor}
          textMain={colors.textMain}
          textDim={colors.textDim}
          textMuted={colors.textMuted}
          onPrev={() => !isFirst && goToPage(currentPage - 1)}
          onNext={() => goToPage(currentPage + 1)}
          onFinish={backOut}
          styles={styles}
        />
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: any, isDark: boolean) => StyleSheet.create({
  screen:        { flex: 1, backgroundColor: c.bgDark },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  hint:          { fontSize: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10, paddingTop: 14 },
  backBtn:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  topTitle:  { fontSize: 14, fontWeight: '800', color: '#fff' },
  topSub:    { fontSize: 10, color: 'rgba(255,255,255,0.70)', marginTop: 1 },
  dotRow:    { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  dotActive: { backgroundColor: '#fff', width: 16, borderRadius: 3 },
  dotDone:   { backgroundColor: '#4ade80', width: 8, height: 8, borderRadius: 4 },
  dotEmpty:  { backgroundColor: 'rgba(255,255,255,0.22)' },
  progressTrack:  { height: 2, backgroundColor: c.borderColor },
  progressFill:   { height: '100%' },
  completionBar:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 6 },
  resumeBar:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.md, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg, borderWidth: 1 },
  resumeText:     { flex: 1, fontSize: 12.5, fontWeight: '600' },
  startOverBtn:   { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  startOverText:  { fontSize: 11.5, fontWeight: '700' },
  resumeClose:    { padding: 2 },
  completionText: { fontSize: 11, fontWeight: '600' },
  imageContainer: { width: '100%', height: 420, position: 'relative', backgroundColor: '#0a0a0a' },
  imageBg:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  imageBgTint:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  storyImage:     { width: '100%', height: '100%' },
  imageOverlay:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: 12 },
  sceneLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sceneLabelText: { fontSize: 13, fontWeight: '700', color: '#fff', flex: 1 },
  pageChip:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  pageChipText:   { fontSize: 11, fontWeight: '700', color: '#fff' },
  doneBadge:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#C5A56A', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  doneBadgeText:  { fontSize: 10, fontWeight: '700', color: '#fff' },
  sceneBanner:    { height: 220, alignItems: 'center', justifyContent: 'center', gap: 16 },
  sceneIconOuter: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  sceneIconInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center' },
  sceneLabelFallback: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // ── Wide-screen (desktop / tablet-landscape) two-column layout: image left, text right ──
  spreadRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  imageColWide:       { flex: 1, maxWidth: 560, borderRadius: radius.xl, overflow: 'hidden' },
  imageContainerWide: { width: '100%', height: 460 },
  sceneBannerWide:    { height: 460, borderRadius: radius.xl },
  textCardWide:       { flex: 1.15, margin: 0, borderWidth: 1 },
  textCard: { margin: spacing.md, borderRadius: radius.xl, overflow: 'hidden', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  cardAccentBar:  { height: 3, borderRadius: 2, marginBottom: 4 },
  // Panel header (storybook chapter heading)
  panelHeader:     { flexDirection: 'row', alignItems: 'center', gap: 9 },
  panelHeaderIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  panelHeaderText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', flex: 1 },
  // Story body: vertical accent bar + serif paragraphs
  storyBody:       { flexDirection: 'row', gap: 14 },
  storyAccentBar:  { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  storyText:      { fontSize: 17, lineHeight: 31, fontWeight: '400', letterSpacing: 0.2, fontFamily: Platform.select({ web: 'Georgia, "Times New Roman", serif', ios: 'Georgia', default: 'serif' }) },
  paraDivider:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 14 },
  paraDividerLine: { flex: 1, height: 1 },
  // Controls
  controlsCol:    { gap: 12, marginTop: 2 },
  listenRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  listenBtn:      { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 24 },
  listenBtnText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
  voiceChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 22, borderWidth: 1 },
  voiceChipText:  { fontSize: 12, fontWeight: '600' },
  speedRow:       { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  speedLabel:     { fontSize: 12, fontWeight: '700', marginRight: 2 },
  speedChip:      { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, borderWidth: 1, minWidth: 42, alignItems: 'center' },
  bottomNav:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 12, borderTopWidth: 1, gap: spacing.md },
  navArrow:       { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  navCenter:      { flex: 1, alignItems: 'center', gap: 2 },
  navPageNum:     { fontSize: 18, fontWeight: '800', fontFamily: fonts.serif },
  navPageOf:      { fontSize: 13, fontWeight: '400' },
  navSceneLabel:  { fontSize: 11, textAlign: 'center' },
  navFinish:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 },
  navFinishText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
});
