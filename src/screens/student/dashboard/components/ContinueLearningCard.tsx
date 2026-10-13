import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { RingChart } from './common/icons';
import { SectionHeader } from './common/SectionHeader';
import type { makeStyles } from '../DashboardScreen';
import { BRAND, SUBJECT_COLORS, SUBJECT_ICONS } from '../constants';
import type { ContinueLearning, LessonRef } from '../../utils/learningPathProgress';

interface ContinueLearningCardProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  cardBg: string;
  continueLearning: ContinueLearning;
  // Topics done in the current topic's chapter (for the ring).
  chapterDone: number;
  // Average quiz score on the current topic, if any.
  quizScore: number | null;
  studentGrade: string;
  ringTrack: string;
  onOpen: (ref: LessonRef) => void;
}

const STATUS_LABEL = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed' } as const;

// "Continue Learning" — the Learning Path topic the student last worked on.
// Left partway → that same topic, "Resume". Finished → marked Completed,
// with the next unfinished topic (next chapter once this one is done) as the
// call to action. Nothing touched yet → the first topic, "Start".
export function ContinueLearningCard({
  styles,
  colors,
  cardBg,
  continueLearning,
  chapterDone,
  quizScore,
  studentGrade,
  ringTrack,
  onOpen,
}: ContinueLearningCardProps) {
  const { current, status, next } = continueLearning;
  const color = SUBJECT_COLORS[current.subject] ?? BRAND.violet;
  const icon = SUBJECT_ICONS[current.subject] ?? 'book-open';
  const total = current.chapter.topics.length;
  const progress = total ? Math.round((chapterDone / total) * 100) : 0;
  const target = status === 'completed' && next ? next : current;
  const statusColor = status === 'completed' ? BRAND.green : status === 'in_progress' ? BRAND.teal : colors.textDim;
  const cta = status === 'completed' ? (next ? 'Start next' : 'Review') : status === 'in_progress' ? 'Resume' : 'Start';
  const hint = status === 'completed'
    ? (next ? `Up next: Chapter ${next.chapter.chapterNo} · ${next.chapter.title} — ${next.topic.name}` : `You've finished every chapter in ${current.subject}!`)
    : status === 'in_progress'
      ? (quizScore != null ? `Quiz score ${quizScore}% — pass the quiz to complete it.` : 'Pick up where you left off.')
      : 'Start to build your foundation.';

  return (
    <>
      <SectionHeader title="Continue Learning" sub="Pick up where you left off" />
      <TouchableOpacity
        testID="continue-learning-card"
        style={[styles.clCard, { backgroundColor: cardBg, borderColor: color + '30' }]}
        onPress={() => onOpen(target)}
        activeOpacity={0.86}
      >
        <View style={[styles.clStrip, { backgroundColor: color }]} />
        <View style={styles.clBody}>
          <View style={styles.clTopRow}>
            <View style={{ flex: 1, gap: 5 }}>
              <View style={[styles.clSubPill, { backgroundColor: color + '15', borderColor: color + '35' }]}>
                <Feather name={icon} size={11} color={color} />
                <Text style={[styles.clSubText, { color }]}>{current.subject} · {studentGrade}</Text>
              </View>
              <Text style={[styles.clTopic, { color: colors.textMain }]} numberOfLines={2}>
                Chapter {current.chapter.chapterNo}: {current.chapter.title}
              </Text>
              <Text style={[styles.clUnit, { color: colors.textMuted }]} numberOfLines={2}>{current.topic.name}</Text>
              <View style={[styles.clSubPill, { alignSelf: 'flex-start', backgroundColor: statusColor + '15', borderColor: statusColor + '40' }]}>
                {status === 'completed' && <Feather name="check-circle" size={11} color={statusColor} />}
                <Text testID="continue-learning-status" style={[styles.clSubText, { color: statusColor }]}>{STATUS_LABEL[status]}</Text>
              </View>
            </View>
            {/* Ring: topics done in this chapter */}
            <View style={styles.clRingWrap}>
              <RingChart progress={progress / 100} color={color} size={68} stroke={7} track={ringTrack} />
              <View style={styles.clRingCenter}>
                <Text style={[styles.clRingPct, { color }]}>{chapterDone}/{total}</Text>
                <Text style={[styles.clRingDone, { color: colors.textDim }]}>done</Text>
              </View>
            </View>
          </View>

          <View style={styles.clBottomRow}>
            <Text style={[styles.clHint, { color: colors.textMuted }]} numberOfLines={2}>{hint}</Text>
            <View style={[styles.clCtaBtn, { backgroundColor: color }]}>
              <Text style={styles.clCtaTxt}>{cta}</Text>
              <Feather name="arrow-right" size={12} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
}
