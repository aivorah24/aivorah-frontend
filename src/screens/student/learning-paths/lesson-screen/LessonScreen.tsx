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
import { useAuth } from '../../../../context/AuthContext';
import Header from '../../../../components/common/Header';
import ScreenLayout from '../../../../components/common/ScreenLayout';
import ImageZoomModal from '../../../../components/common/ImageZoomModal';
import { getSubjectSyllabus } from '../../../../data/syllabusRegistry';

import { makeStyles } from './styles';
import type { Mode, ListenStep } from './types';
import { useDbTopic } from './hooks/useDbTopic';
import { useNarration } from './hooks/useNarration';
import { useTopicUnlock } from './hooks/useTopicUnlock';
import { usePracticeRedirect } from './hooks/usePracticeRedirect';
import { adaptTeacherContentToTopic, type TeacherTopicContent } from './utils/adaptTeacherContent';
import { buildReasoningListen } from './utils/listenFromBlocks';
import { buildMathTutorSteps } from './utils/mathTutor';
import ReadTab from './components/ReadTab';
import AskTab from './components/AskTab';
import ListenTab from './components/ListenTab';
import PracticeTab from './components/PracticeTab';
import FullBookOverlay from './components/FullBookOverlay';
import ComingSoonPane from './components/ComingSoonPane';
import { useStudentSubjectEdits } from '../subject-syllabus/hooks/useStudentSubjectEdits';
import { useRefreshOnFocus } from '../subject-syllabus/hooks/useRefreshOnFocus';
import { useStudentData } from '../../../../context/StudentDataContext';
import { useLessonActivityTracking } from './hooks/useLessonActivityTracking';

// A link without an edit key finds the teacher's lesson by topic name, when exactly one edited topic has that name.
function lessonForTopicName(edits: any, name?: string) {
  if (!edits?.topics || !name) return undefined;
  const suffix = `::${name.trim().toLowerCase()}`;
  const keys = Object.keys(edits.topics).filter((k) => k.endsWith(suffix));
  return keys.length === 1 ? edits.topics[keys[0]] : undefined;
}

function LessonShell({ embedded, children }: { embedded: boolean; children: React.ReactNode }) {
  return embedded
    ? <View testID="embedded-lesson" style={{ height: 760, borderRadius: 12, overflow: 'hidden' }}>{children}</View>
    : <ScreenLayout>{children}</ScreenLayout>;
}

// `embedded`: rendered inside another screen (the teacher's review) — no page header, no Ask tab, and Practice shows
// `practiceSlot` in place instead of opening the Quiz screen.
export default function LessonScreen({ navigation, route, embedded = false, practiceSlot }: any) {
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
  // A link that carries a topic name but no id or teacher content (e.g. one saved before book-section topics were
  // opened by name) still resolves by that name rather than falling back to the old built-in lessons.
  const byNameTopic = (route?.params?.byNameTopic
    ?? (route?.params?.topicName && !route?.params?.topicId && !route?.params?.teacherContent ? route.params.topicName : undefined)) as string | undefined;
  const byName = !topicId && byNameTopic
    ? { curriculum, grade, subject, topic: byNameTopic }
    : undefined;
  // A teacher-published Curriculum Learning Path topic (Groq/Qdrant-grounded
  // content from aivorah-learning-paths-service, see teacher-learning-paths/
  // TeacherPublishedLearningPathScreen) carries its own {whatYoullLearn,
  // blocks} content directly via route params instead of a topicId/byName
  // lookup — no fetch needed, ReadTab already renders these exact block
  // shapes (LearningBlocks.tsx), so this reuses the whole Read/Listen/Ask/
  // Practice flow rather than building a parallel one.
  const teacherContent = route?.params?.teacherContent as TeacherTopicContent | undefined;
  const isTeacherContentBacked = !!teacherContent;
  const teacherTopicName = route?.params?.topicName as string | undefined;

  // The student's teacher's edited version of this topic, by its key (a plain string, so it survives a page refresh).
  // The teacher's own preview passes the edits in directly instead.
  const editKey = route?.params?.editKey as string | undefined;
  const directEdits = route?.params?.lessonEdits;
  const wantsEdits = !directEdits && !embedded && (!!editKey || !!byName);
  const { edits: subjectEdits, loaded: editsLoaded } = useStudentSubjectEdits(curriculum, grade, subject, { enabled: wantsEdits, refreshKey: useRefreshOnFocus(embedded ? null : navigation) });
  const lessonEdits = directEdits || (editKey ? subjectEdits?.topics?.[editKey] : lessonForTopicName(subjectEdits, byName?.topic));
  const waitingForEdits = wantsEdits && !editsLoaded;

  const { dbTopic: fetchedDbTopic, rawPayload: fetchedRawPayload, loadingDbTopic: loadingFetchedTopic, contentReady: fetchedContentReady } =
    useDbTopic(topicId, route?.params?.topicName ?? byNameTopic, byName, { enabled: !isTeacherContentBacked && !waitingForEdits, override: lessonEdits });
  const loadingDbTopic = loadingFetchedTopic || waitingForEdits;
  const teacherDbTopic = useMemo(
    () => (isTeacherContentBacked ? adaptTeacherContentToTopic(teacherTopicName || '', teacherContent) : null),
    [isTeacherContentBacked, teacherContent, teacherTopicName]
  );
  const dbTopic = isTeacherContentBacked ? teacherDbTopic : fetchedDbTopic;
  const rawPayload = isTeacherContentBacked
    ? { whatYoullLearn: teacherContent?.whatYoullLearn, blocks: teacherContent?.blocks, mathTutor: (teacherContent as any)?.mathTutor }
    : fetchedRawPayload;
  const contentReady = isTeacherContentBacked ? true : fetchedContentReady;

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

  const isDbBacked = !!topicId || !!byName || isTeacherContentBacked;
  const chapter = isDbBacked
    ? { title: chapterTitleParam || byNameTopic || teacherTopicName || '', topics: dbTopic ? [dbTopic] : [] }
    : getSubjectSyllabus(curriculum, grade, subject)[chapterIndex];
  const topic = isDbBacked ? dbTopic ?? undefined : chapter?.topics[topicIndex];

  // A lesson with a reasoning-flow block is narrated card by card so the Listen board can follow the audio.
  const reasoning = useMemo(() => buildReasoningListen(rawPayload), [rawPayload]);

  const mathTutorSteps = useMemo(() => (isMath ? buildMathTutorSteps(rawPayload) : null), [isMath, rawPayload]);

  const listenSteps: ListenStep[] = useMemo(() => {
    if (!topic) return [];
    if (mathTutorSteps) return mathTutorSteps;
    if (reasoning) return reasoning.steps;
    if (topic.readText.listenParts && topic.readText.listenParts.length > 0) {
      return topic.readText.listenParts.map((p: any) => ({
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
        ...(topic.readText.activity ? [{ label: 'Your turn', heading: 'Your turn', text: topic.readText.activity }] : []),
      ];
    }
    return [
      { label: 'Introduction', heading: 'Introduction', text: topic.readText.intro },
      ...topic.readText.body.map((p: any, i: number) => ({ label: `Part ${i + 1}`, heading: `Part ${i + 1}`, text: p })),
      { label: 'Try this yourself', heading: 'Try this yourself', text: topic.readText.activity },
    ];
  }, [topic, reasoning, mathTutorSteps]);

  const vocab = topic?.readText.vocab ?? [];

  // Poem lessons are recited, not read: slower pace + a short breath between
  // lines so it lands as a rhythmic recitation rather than flat narration.
  const isPoem = ((rawPayload?.instructionalType as string) || '').toLowerCase().includes('poem');

  const narration = useNarration(listenSteps, isPoem, (rawPayload as any)?.lang, navigation);

  // Practice unlocks once the topic is learned: Learn read to the end, or every Listen part heard.
  const { user } = useAuth() || ({} as any);
  const { unlocked, markLearned } = useTopicUnlock(user?.email, `${curriculum}|${grade}|${subject}`, topic?.name);
  const practiceLocked = !embedded && !unlocked;
  const listenDone = listenSteps.length > 0 && listenSteps.every((_s, i) => narration.completedSteps?.has(i));
  useEffect(() => { if (listenDone) markLearned(); }, [listenDone, markLearned]);
  const { startTopicActivity, recordStudySeconds } = useStudentData();
  useLessonActivityTracking(
    { topicName: topic?.name, subject, mode, contentReady, enabled: !embedded },
    { startTopicActivity, recordStudySeconds }
  );

  usePracticeRedirect(embedded ? 'read' : mode, setMode, topic, navigation, {
    grade, subject, curriculum, topicId, chapterIndex, topicIndex,
    byNameTopic, chapterTitle: chapter?.title, teacherContent, editKey,
    bookQuiz: (rawPayload as any)?.practiceQuiz,
  }, contentReady, practiceLocked);

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
      <LessonShell embedded={embedded}>
        <View style={styles.screen}>
          {!embedded && <Header title="Lesson" showBack onMenuPress={() => navigation.openDrawer()} />}
          <View style={styles.centerWrap}><ActivityIndicator color={colors.primary} /></View>
        </View>
      </LessonShell>
    );
  }

  if (!chapter || !topic) {
    return (
      <LessonShell embedded={embedded}>
        <View style={styles.screen}>
          {!embedded && <Header title="Lesson" showBack onMenuPress={() => navigation.openDrawer()} />}
          <View style={styles.centerWrap}>
            <Feather name="alert-circle" size={32} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 10 }}>This lesson isn&apos;t available yet.</Text>
          </View>
        </View>
      </LessonShell>
    );
  }

  const tabs: { key: Mode; label: string; icon: any }[] = [
    { key: 'read', label: 'Learn', icon: 'book-open' },
    { key: 'listen', label: isMath ? 'AI Tutor' : 'Listen', icon: isMath ? 'cpu' : 'headphones' },
    { key: 'ask', label: 'Ask Aivorah', icon: 'message-circle' },
    { key: 'practice', label: 'Practice', icon: practiceLocked ? 'lock' : 'check-square' },
  ].filter((t) => !(embedded && t.key === 'ask')) as { key: Mode; label: string; icon: any }[];

  return (
    <LessonShell embedded={embedded}>
      <View style={styles.screen}>
        {!embedded && (
          <Header
            title={topic.name}
            subtitle={`Unit ${chapterIndex + 1} · ${chapter.title}`}
            showBack
            onMenuPress={() => navigation.openDrawer()}
          />
        )}

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
                onReachedEnd={markLearned}
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
                reasoning={reasoning}
                grade={grade}
                subject={subject}
                curriculum={curriculum}
                unitTitle={chapter?.title}
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
                {mode === 'practice' && embedded && practiceSlot}
                {mode === 'practice' && !embedded && (
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
                    locked={practiceLocked}
                    onGoTo={setMode}
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
    </LessonShell>
  );
}
