/**
 * LessonScreen.tsx
 * Step 4 of the redesigned Learning Path flow: the actual lesson, opened
 * from SubjectSyllabusScreen. Four modes, matching the approved prototype:
 *   Read (default) · Listen · Ask AI (Aivorah) · Practice
 *
 * Backed today by the curated CBSE Grade 6 English dataset. Falls back to
 * TopicLesson's existing scene-based viewer for anything not yet curated.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import Header from '../../../../components/common/Header';
import ScreenLayout from '../../../../components/common/ScreenLayout';
import ImageZoomModal from '../../../../components/common/ImageZoomModal';
import { getSubjectSyllabus } from '../../../../data/syllabusRegistry';

import { makeStyles } from './styles';
import type { Mode, ListenStep } from './types';
import { useDbTopic } from './hooks/useDbTopic';
import { useNarration } from './hooks/useNarration';
import { usePracticeRedirect } from './hooks/usePracticeRedirect';
import ReadTab from './components/ReadTab';
import AskTab from './components/AskTab';
import ListenTab from './components/ListenTab';
import PracticeTab from './components/PracticeTab';
import FullBookOverlay from './components/FullBookOverlay';
import ComingSoonPane from './components/ComingSoonPane';

export default function LessonScreen({ navigation, route }: any) {
  const subject = (route?.params?.subject ?? 'English') as string;
  const curriculum = (route?.params?.curriculum ?? 'CBSE') as string;
  const grade = (route?.params?.grade ?? 'Grade 6') as string;
  // Number(...), not just a type cast — URL-based navigation (deep links,
  // page refresh) delivers these as strings ("6"), and `"6" + 1` silently
  // produces "61" instead of 7 wherever the index is used arithmetically.
  const chapterIndex = Number(route?.params?.chapterIndex ?? 0);
  const topicIndex = Number(route?.params?.topicIndex ?? 0);
  const topicId = route?.params?.topicId as string | undefined;
  const chapterTitleParam = route?.params?.chapterTitle as string | undefined;
  // A real NCERT/Qdrant-only topic with no DB id (Bug #8, BUGS_AND_FIXES.md) —
  // resolved by curriculum+grade+subject+topic instead of topicId.
  const byNameTopic = route?.params?.byNameTopic as string | undefined;
  const byName = !topicId && byNameTopic
    ? { curriculum, grade, subject, topic: byNameTopic }
    : undefined;

  const { dbTopic, rawPayload, loadingDbTopic, contentReady } = useDbTopic(topicId, route?.params?.topicName ?? byNameTopic, byName);

  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Allow the visual-QA harness (and deep links) to open a specific tab directly
  // via ?mode=listen|practice|ask — far more reliable than simulating tab clicks.
  const initialMode = ((): Mode => {
    const m = route?.params?.mode;
    if (m === 'listen' || m === 'practice' || m === 'ask' || m === 'read') return m;
    return 'read';
  })();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullBookView, setFullBookView] = useState(false);
  const [fontLarge, setFontLarge] = useState(false);
  const [pauseAnswer, setPauseAnswer] = useState<number | null>(null);
  const [vocabIndex, setVocabIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState<{ uri: string; caption?: string } | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const isMath = /math/i.test(subject);

  const isDbBacked = !!topicId || !!byName;
  const chapter = isDbBacked
    ? { title: chapterTitleParam || byNameTopic || '', topics: dbTopic ? [dbTopic] : [] }
    : getSubjectSyllabus(curriculum, grade, subject)[chapterIndex];
  const topic = isDbBacked ? dbTopic ?? undefined : chapter?.topics[topicIndex];

  const listenSteps: ListenStep[] = useMemo(() => {
    if (!topic) return [];
    if (topic.readText.listenParts && topic.readText.listenParts.length > 0) {
      return topic.readText.listenParts.map(p => ({
        label: p.heading, heading: p.heading, text: p.text, keyIdea: p.keyIdea, pauseThink: p.pauseThink,
      }));
    }
    // Maths/Concept lessons: the AI Tutor walks through each WORKED EXAMPLE
    // step-by-step (that's what a tutor does), not just the intro theory.
    const worked = (topic.readText as any).workedExamples as any[] | undefined;
    if (worked && worked.length > 0) {
      return [
        { label: 'Introduction', heading: 'Introduction', text: topic.readText.intro },
        ...worked.map((ex, i) => ({
          label: `Example ${i + 1}`,
          heading: `Example ${i + 1}: ${ex.problem}`,
          text: `${ex.problem}. ${(ex.steps || []).join(' ')} So the answer is ${ex.answer}.`,
        })),
        { label: 'Your turn', heading: 'Your turn', text: topic.readText.activity || 'Now try a subtraction with borrowing on your own.' },
      ];
    }
    return [
      { label: 'Introduction', heading: 'Introduction', text: topic.readText.intro },
      ...topic.readText.body.map((p, i) => ({ label: `Part ${i + 1}`, heading: `Part ${i + 1}`, text: p })),
      { label: 'Try this yourself', heading: 'Try this yourself', text: topic.readText.activity },
    ];
  }, [topic]);

  const vocab = topic?.readText.vocab ?? [];

  // Poem lessons are recited, not read: slower pace + a short breath between
  // lines so it lands as a rhythmic recitation rather than flat narration.
  const isPoem = ((rawPayload?.instructionalType as string) || '').toLowerCase().includes('poem');

  const narration = useNarration(listenSteps, isPoem);

  usePracticeRedirect(mode, setMode, topic, navigation, {
    grade, subject, curriculum, topicId, chapterIndex, topicIndex,
    byNameTopic, chapterTitle: chapter?.title,
  }, contentReady);

  // Reset all per-lesson UI/narration state whenever the mode or the lesson
  // itself changes, so switching topics never leaves stale playback/answer
  // state from the previous one.
  useEffect(() => {
    // external sync (narration engine reset) alongside the state reset below —
    // not purely derivable state, kept as an effect
    narration.resetNarration();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPauseAnswer(null);
    setVocabIndex(0);
  }, [mode, topicIndex, chapterIndex]);

  // Reset the pause-answer state whenever the narration advances to a new step —
  // adjusted during render (React's documented "adjusting state when a prop
  // changes" pattern) instead of an effect.
  const [prevListenStep, setPrevListenStep] = useState(narration.listenStep);
  if (prevListenStep !== narration.listenStep) {
    setPrevListenStep(narration.listenStep);
    setPauseAnswer(null);
  }

  if (loadingDbTopic) {
    return (
      <ScreenLayout>
        <View style={styles.screen}>
          <Header title="Lesson" showBack onMenuPress={() => navigation.openDrawer()} />
          <View style={styles.centerWrap}><ActivityIndicator color={colors.primary} /></View>
        </View>
      </ScreenLayout>
    );
  }

  if (!chapter || !topic) {
    return (
      <ScreenLayout>
        <View style={styles.screen}>
          <Header title="Lesson" showBack onMenuPress={() => navigation.openDrawer()} />
          <View style={styles.centerWrap}>
            <Feather name="alert-circle" size={32} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 10 }}>This lesson isn&apos;t available yet.</Text>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  const tabs: { key: Mode; label: string; icon: any }[] = [
    { key: 'read', label: 'Learn', icon: 'book-open' },
    { key: 'listen', label: isMath ? 'AI Tutor' : 'Listen', icon: isMath ? 'cpu' : 'headphones' },
    { key: 'ask', label: 'Ask Aivorah', icon: 'message-circle' },
    { key: 'practice', label: 'Practice', icon: 'check-square' },
  ];

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title={topic.name}
          subtitle={`Unit ${chapterIndex + 1} · ${chapter.title}`}
          showBack
          onMenuPress={() => navigation.openDrawer()}
        />

        <View style={styles.tabBarRow}>
          <View style={[styles.tabBar, { backgroundColor: colors.bgDark, borderColor: colors.borderColor }]}>
            {tabs.map(t => {
              const active = mode === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tab, active && { backgroundColor: colors.cardDark }]}
                  onPress={() => setMode(t.key)}
                  activeOpacity={0.75}
                >
                  <Feather name={t.icon} size={14} color={active ? colors.primary : colors.textMuted} />
                  <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!topic.pdfFile && (
            <TouchableOpacity
              style={[styles.viewInBookBtn, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}
              onPress={() => setFullBookView(true)}
              activeOpacity={0.8}
            >
              <Feather name="book" size={13} color={colors.textMain} />
              <Text style={[styles.viewInBookText, { color: colors.textMain }]}>View in Book</Text>
            </TouchableOpacity>
          )}
        </View>

        {!contentReady ? (
          // No real content exists for this topic yet — every tab shows the
          // same honest "Coming soon" state instead of a blank/partially
          // working Learn, Listen, Ask, or Practice screen.
          <ComingSoonPane topicName={topic.name} colors={colors} styles={styles} />
        ) : (
          <>
            {mode === 'read' && (
              <ReadTab
                topic={topic}
                rawPayload={rawPayload}
                grade={grade}
                subject={subject}
                colors={colors}
                styles={styles}
                onZoomImage={setZoomImage}
                onReadFullBook={() => setFullBookView(true)}
              />
            )}

            <FullBookOverlay
              visible={fullBookView}
              topic={topic}
              grade={grade}
              subject={subject}
              colors={colors}
              styles={styles}
              onClose={() => setFullBookView(false)}
            />

            {mode === 'ask' && (
              <AskTab
                topic={topic}
                chapter={chapter}
                grade={grade}
                subject={subject}
                curriculum={curriculum}
                chapterIndex={chapterIndex}
                colors={colors}
                styles={styles}
                onReadFullBook={() => setFullBookView(true)}
              />
            )}

            {mode === 'listen' && (
              <ListenTab
                topic={topic}
                isMath={isMath}
                listenSteps={listenSteps}
                colors={colors}
                styles={styles}
                narration={narration}
                fontLarge={fontLarge}
                setFontLarge={setFontLarge}
                vocab={vocab}
                vocabIndex={vocabIndex}
                setVocabIndex={setVocabIndex}
                pauseAnswer={pauseAnswer}
                setPauseAnswer={setPauseAnswer}
                whyOpen={whyOpen} setWhyOpen={setWhyOpen}
                explainOpen={explainOpen} setExplainOpen={setExplainOpen}
                hintOpen={hintOpen} setHintOpen={setHintOpen}
                exampleOpen={exampleOpen} setExampleOpen={setExampleOpen}
                setMode={setMode}
                setZoomImage={setZoomImage}
              />
            )}

            {mode !== 'read' && mode !== 'ask' && mode !== 'listen' && (
              <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {mode === 'practice' && (
                  <PracticeTab
                    topic={topic}
                    grade={grade}
                    subject={subject}
                    curriculum={curriculum}
                    chapterIndex={chapterIndex}
                    topicIndex={topicIndex}
                    topicId={topicId}
                    colors={colors}
                    styles={styles}
                    navigation={navigation}
                  />
                )}
              </ScrollView>
            )}
          </>
        )}
      </View>
      <ImageZoomModal
        visible={!!zoomImage}
        uri={zoomImage?.uri || ''}
        caption={zoomImage?.caption}
        onClose={() => setZoomImage(null)}
      />
    </ScreenLayout>
  );
}
