/**
 * SubjectSyllabusScreen.tsx
 * Textbook-first syllabus view: Subject → collapsible chapters → topics.
 * Step 3 of the redesigned Learning Path flow:
 *   Learning Path → Curriculum → Subject → Syllabus (this screen) → Lesson
 *
 * Currently backed by a curated, verified dataset for CBSE Grade 6 English
 * (see src/data/cbseG6EnglishSyllabus.ts). Falls back to the existing flat
 * topic list (SubjectTopicsScreen) for any subject/grade/curriculum that
 * doesn't have curated chapter data yet.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  Platform, UIManager,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { useStudentData } from '../../../../context/StudentDataContext';
import Header from '../../../../components/common/Header';
import ScreenLayout from '../../../../components/common/ScreenLayout';
import { type SyllabusChapter } from '../../../../data/cbseG6EnglishSyllabus';

import { makeStyles } from './styles';
import { useSyllabusChapters } from './hooks/useSyllabusChapters';
import { useChapterExpansion } from './hooks/useChapterExpansion';
import ChapterCard from './components/ChapterCard';
import { useTeacherPaths } from '../teacher-learning-paths/hooks/useTeacherPaths';
import { teacherChapters } from './teacherChapters';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SubjectSyllabusScreen({ navigation, route }: any) {
  const subject    = (route?.params?.subject    ?? 'English')     as string;
  const curriculum = (route?.params?.curriculum ?? 'CBSE')        as string;
  const grade      = (route?.params?.grade      ?? 'Grade 6')     as string;

  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { stats: studentStats } = useStudentData();
  const completedSet = useMemo(() => new Set(studentStats.completedTopics ?? []), [studentStats.completedTopics]);

  const { chapters: bookChapters, isDbBacked, loadingDb, loadError } = useSyllabusChapters(curriculum, grade, subject);
  // The teacher's published units are ordinary chapters of this subject (first, as the class follows them).
  const { paths: teacherPaths } = useTeacherPaths(grade, subject);
  const chapters = useMemo(() => [...teacherChapters(teacherPaths), ...bookChapters], [teacherPaths, bookChapters]);

  // Grade 1-2 NCERT books are genuinely two levels — a Unit (e.g. "My Family
  // and Me") directly containing individual poems/stories, with no chapter
  // tier between them. The database still stores one row per Unit with the
  // real poems/stories as its "topics" (no schema change was available to add
  // a proper Unit column), so here we only relabel: the row becomes "Unit N"
  // and its topics become "Chapter N" instead of "Topic N", matching what the
  // printed textbook page itself shows. Every other grade keeps the real
  // Chapter -> Topic labels unchanged.
  const isUnitShaped = curriculum === 'CBSE' && (grade === 'Grade 1' || grade === 'Grade 2');

  // A subject with no syllabus used to be auto-forwarded to the flat topic list.
  // When that list was empty too — Hindi, and any subject whose book has not been
  // parsed yet — the student landed on a blank screen with no explanation. Show
  // an explicit "being prepared" state instead, and keep the topic list as an
  // option the student can choose rather than an invisible redirect.
  const wantChapterTitle = route?.params?.chapterTitle as string | undefined;
  const { openChapters, toggleChapter } = useChapterExpansion(chapters, wantChapterTitle);
  const [query, setQuery] = useState('');

  function openLesson(chapter: SyllabusChapter, chapterIndex: number, topicIndex: number) {
    const topic = chapter.topics[topicIndex] as any;
    if ((chapter as any).teacherUnit) {
      const meta = (chapter as any).teacherMeta || {};
      navigation.navigate('LessonScreen', {
        subject, grade,
        curriculum: meta.curriculum || curriculum,
        chapterTitle: chapter.title,
        chapterIndex: topic.unitOrder,
        topicIndex: topic.topicOrder,
        topicName: topic.name,
        teacherContent: topic.teacherContent,
      });
      return;
    }
    // Two different kinds of "real" (non-curated) topic share this list:
    // a teacher-published one with a real syllabus_topics DB id, and a real
    // NCERT/Qdrant topic with no DB row at all (kind: 'qdrant' — see Bug #8
    // and its Bug #11 follow-up, BUGS_AND_FIXES.md). Sending a Qdrant topic's
    // synthetic id ("qdrant:...") as `topicId` made LessonScreen fetch from
    // the DB-id route instead of the byName route, which found nothing —
    // "Content coming soon" for a topic that has real content in Qdrant.
    const isQdrantTopic = isDbBacked && topic?.kind === 'qdrant';
    navigation.navigate('LessonScreen', {
      subject, curriculum, grade,
      chapterTitle: chapter.title,
      chapterIndex,
      topicIndex,
      // Real teacher-published topic — LessonScreen fetches its resolved
      // resources from the DB instead of the static curated dataset.
      topicId: isDbBacked && !isQdrantTopic ? topic?.id : undefined,
      topicName: isDbBacked ? topic?.name : undefined,
      byNameTopic: isQdrantTopic ? topic?.name : undefined,
    });
  }

  const q = query.trim().toLowerCase();
  const filteredChapters = chapters
    .map((ch, ci) => {
      const chapterMatches = ch.title.toLowerCase().includes(q);
      const topics = ch.topics.filter(t => !q || chapterMatches || t.name.toLowerCase().includes(q));
      return { chapter: ch, ci, topics, chapterMatches };
    })
    .filter(x => !q || x.chapterMatches || x.topics.length > 0);

  // If a chapter or topic matches the search, force it open.
  const effectiveOpen = q ? new Set(filteredChapters.map(x => x.ci)) : openChapters;

  const books = [...new Set(chapters.map((c) => (c as { book?: string | null }).book).filter((b): b is string => !!b))];
  const totalTopicsCount = chapters.reduce((s, c) => s + c.topics.length, 0);
  // Guard the denominator, not just chapters.length — a subject can have real
  // chapters with zero real topics yet (all pending/"Being prepared"), which
  // divided out as 0/0 and rendered "NaN%" instead of 0%.
  const overallPct = totalTopicsCount
    ? Math.round((chapters.reduce((s, c) => s + c.topics.filter(t => completedSet.has(t.name)).length, 0) / totalTopicsCount) * 100)
    : 0;
  const startedChapters = chapters.filter(c => c.topics.some(t => completedSet.has(t.name))).length;

  if (loadingDb) {
    return (
      <ScreenLayout>
        <View style={styles.screen}>
          <Header title={subject} subtitle={`${curriculum} · ${grade}`} showBack onMenuPress={() => navigation.openDrawer()} />
          <View style={styles.emptyWrap}><ActivityIndicator color={colors.primary} /></View>
        </View>
      </ScreenLayout>
    );
  }

  if (chapters.length === 0) {
    // No curated syllabus for this subject/grade/curriculum yet — send to the
    // existing flat topic list so nothing regresses for other subjects.
    return (
      <ScreenLayout>
        <View style={styles.screen}>
          <Header title={subject} subtitle={`${curriculum} · ${grade}`} showBack onMenuPress={() => navigation.openDrawer()} />
          <View style={styles.emptyWrap}>
            <Feather name={loadError ? 'alert-circle' : 'book'} size={36} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {loadError
                ? `We couldn't load the ${subject} syllabus just now. Please try again in a moment.`
                : `Syllabus content for ${subject} (${grade}) is currently being processed. Check back soon!`}
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('SubjectTopics', { subject, curriculum, grade })}
            >
              <Text style={styles.emptyBtnText}>View topic list instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title={subject}
          subtitle={`${books.length ? `${books.join(' · ')} · ` : ''}${curriculum} · ${grade} · Full syllabus`}
          showBack
          onMenuPress={() => navigation.openDrawer()}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search */}
          <View style={[styles.searchBar, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
            <Feather name="search" size={15} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textMain }]}
              placeholder="Search chapters or topics…"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Feather name="x" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Overall progress */}
          <View style={[styles.progressCard, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
            <View style={[styles.ring, { borderColor: colors.borderColor }]}>
              <Text style={[styles.ringPct, { color: colors.textMain }]}>{overallPct}%</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.progressLine, { color: colors.textMain }]}>
                {startedChapters} of {chapters.length} {isUnitShaped ? 'units' : 'chapters'} started
              </Text>
              <Text style={[styles.progressSub, { color: colors.textMuted }]}>
                {grade} {subject} · {chapters.length} {isUnitShaped ? 'units' : 'chapters'} · {totalTopicsCount} {isUnitShaped ? 'chapters' : 'topics'} total
              </Text>
            </View>
          </View>

          {/* Chapters — single column: a 2-column grid left an awkward gap
              next to whichever card was expanded to show its topics. */}
          {filteredChapters.map(({ chapter, ci, topics }) => (
            <ChapterCard
              key={`${(chapter as any).teacherUnit ? 'u' : 'c'}-${ci}-${chapter.title}`}
              chapter={chapter}
              ci={ci}
              topics={topics}
              isOpen={effectiveOpen.has(ci)}
              completedSet={completedSet}
              isUnitShaped={isUnitShaped}
              colors={colors}
              styles={styles}
              onToggle={() => toggleChapter(ci)}
              onOpenTopic={(ti) => openLesson(chapter, ci, ti)}
            />
          ))}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
