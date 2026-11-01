import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { type SyllabusChapter } from '../../../../../data/cbseG6EnglishSyllabus';
import { makeStyles } from '../styles';

export default function ChapterCard({
  chapter,
  ci,
  topics,
  isOpen,
  completedSet,
  isUnitShaped,
  colors,
  styles,
  onToggle,
  onOpenTopic,
}: {
  chapter: SyllabusChapter;
  ci: number;
  topics: SyllabusChapter['topics'];
  isOpen: boolean;
  completedSet: Set<string>;
  isUnitShaped: boolean;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
  onToggle: () => void;
  onOpenTopic: (topicIndex: number) => void;
}) {
  const doneCount = chapter.topics.filter(t => completedSet.has(t.name)).length;
  const pct = chapter.topics.length ? Math.round((doneCount / chapter.topics.length) * 100) : 0;
  const complete = pct === 100;
  // `unitNo` is the textbook's chapter number, supplied by
  // /teacher/syllabus/current. Fall back to position only for the
  // older curated datasets that carry no number.
  const chapterNo = (chapter as any).unitNo ?? (ci + 1);
  // A chapter the book has but no lesson has been written for yet. Trust the
  // server's own `pending` field when it provided one — it already accounts
  // for real Qdrant content, not just whether a syllabus_topics DB row
  // exists (Bug #11, BUGS_AND_FIXES.md). `chapter.topics` stays empty for
  // virtually all NCERT content regardless of Qdrant (that table is a
  // separate, teacher-upload-only feature) — ORing it in here as a second,
  // independent trigger silently discarded the server's correct answer for
  // exactly that case. Only fall back to the topics-empty heuristic for
  // sources that never send `pending` at all (the curated syllabusRegistry
  // datasets, which are always considered complete).
  const serverPending = (chapter as any).pending;
  const isPending = serverPending !== undefined ? !!serverPending : chapter.topics.length === 0;
  // Syllabus-only boards (e.g. ICSE Classes I–VIII) list chapters without topics;
  // the server sends the chapter as its own single topic. Show just the chapter.
  const chapterOnly = chapter.topics.length === 1 && chapter.topics[0].name === chapter.title;
  const subtopicNames: string[] = (chapter as any).subtopics || [];
  // A teacher's own units read "Unit N" like the teacher's document; their topics stay "Topic N".
  const chapterWord = isUnitShaped || (chapter as any).teacherUnit ? 'Unit' : 'Chapter';

  return (
    <View style={[styles.chapterCard, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
      <TouchableOpacity style={styles.chapterHead} activeOpacity={0.7} onPress={chapterOnly ? () => onOpenTopic(0) : onToggle}>
        <Feather
          name="chevron-right"
          size={18}
          color={isOpen ? colors.primary : colors.textMuted}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />
        <View style={[styles.chapterNum, { backgroundColor: complete ? colors.primary + '22' : colors.borderColor + '55' }]}>
          <Text style={[styles.chapterNumText, { color: complete ? colors.primary : colors.textMuted }]}>{chapterNo}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* The book's own chapter number, never the array index —
                a syllabus with any chapter still unwritten used to
                renumber every chapter after it, so Chapter 3 appeared
                as "Unit 2". */}
            {/* Where the book gave no readable heading the title is
                already "Chapter 7", so prefixing it produced
                "Chapter 7: Chapter 7". Show the number once. */}
            <Text style={[styles.chapterTitle, { color: colors.textMain }]}>
              {/^chapter\s*\d+$/i.test(String(chapter.title || '').trim())
                ? `${chapterWord} ${chapterNo}`
                : `${chapterWord} ${chapterNo}: ${chapter.title}`}
            </Text>
            {(chapter.comingSoon || isPending) && (
              <View style={[styles.comingSoonBadge, { borderColor: colors.borderColor, backgroundColor: colors.borderColor + '55' }]}>
                <Text style={[styles.comingSoonText, { color: colors.textMuted }]}>Coming soon</Text>
              </View>
            )}
          </View>
          <Text style={[styles.chapterSub, { color: colors.textMuted }]}>
            {isPending
              ? `${subtopicNames.length || 0} sub-topic${subtopicNames.length === 1 ? '' : 's'} in the textbook`
              : isUnitShaped
                ? `${chapter.topics.length} chapter${chapter.topics.length === 1 ? '' : 's'}`
                : chapterOnly && chapter.comingSoon
                  ? 'Lessons coming soon'
                  : `${chapter.topics.length} topic${chapter.topics.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <View style={styles.chapterProgress}>
          <View style={[styles.progBarTrack, { backgroundColor: colors.borderColor }]}>
            <View style={[styles.progBarFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.progPctText, { color: colors.textMuted }]}>{pct}%</Text>
        </View>
      </TouchableOpacity>

      {isOpen && isPending && (
        <View style={styles.topicGrid}>
          {/* The chapter exists in the textbook but has no lesson yet.
              Listing its real sub-topics tells the student what the
              chapter covers instead of opening onto nothing. */}
          {subtopicNames.length === 0 ? (
            <Text style={[styles.chapterSub, { color: colors.textMuted, paddingHorizontal: 4, paddingVertical: 8 }]}>
              Lessons for this chapter are being prepared.
            </Text>
          ) : subtopicNames.map((name, si) => (
            <View
              key={name}
              style={[styles.topicItem, { backgroundColor: colors.bgDark, borderColor: colors.borderColor, opacity: 0.6 }]}
            >
              <View style={[styles.topicDot, { backgroundColor: colors.borderColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.topicLabel, { color: colors.textMain }]} numberOfLines={1}>
                  Sub-topic {si + 1}: {name}
                </Text>
                <Text style={[styles.topicKind, { color: colors.textMuted }]}>Being prepared</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {isOpen && !isPending && !chapterOnly && (
        <View style={styles.topicGrid}>
          {topics.map((t) => {
            const ti = chapter.topics.indexOf(t);
            // A topic's own comingSoon flag wins when set; otherwise
            // it inherits the chapter's — lets one topic in an
            // otherwise-unready chapter go live on its own.
            const topicComingSoon = t.comingSoon ?? chapter.comingSoon;
            return (
              <TouchableOpacity
                key={t.name}
                style={[styles.topicItem, { backgroundColor: colors.bgDark, borderColor: colors.borderColor, opacity: topicComingSoon ? 0.6 : 1 }]}
                activeOpacity={0.7}
                // Still tappable: the screen answers with a "Coming soon"
                // dialog rather than silently ignoring the tap.
                onPress={() => onOpenTopic(ti)}
                testID={topicComingSoon ? `topic-coming-soon-${ti}` : undefined}
              >
                <View style={[styles.topicDot, { backgroundColor: completedSet.has(t.name) ? colors.primary : colors.borderColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topicLabel, { color: colors.textMain }]} numberOfLines={1}>
                    {/^chapter\s*\d+$/i.test(String(t.name || '').trim())
                      ? `${isUnitShaped ? 'Chapter' : 'Topic'} ${ti + 1}`
                      : `${isUnitShaped ? 'Chapter' : 'Topic'} ${ti + 1}: ${t.name}`}
                  </Text>
                  {/* Only the "Coming soon" state is worth a second
                      line. The `kind` field said "Chapter" on older
                      rows and "Topic" on newer ones, so every item
                      carried a stray, inconsistent word under a label
                      that already reads "Topic 3: ...". */}
                  {!!topicComingSoon && (
                    <Text style={[styles.topicKind, { color: colors.textMuted }]}>Coming soon</Text>
                  )}
                </View>
                {!topicComingSoon && <Feather name="chevron-right" size={14} color={colors.textMuted} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
