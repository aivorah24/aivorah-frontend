import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { RingChart } from './common/icons';
import { SectionHeader } from './common/SectionHeader';
import type { makeStyles } from '../DashboardScreen';

interface FeaturedLesson {
  grade: string; subject: string; topic: string; unit: string;
  color: string; icon: React.ComponentProps<typeof Feather>['name'];
  progress: number; quizScore: number | null; quizCount: number;
}

interface FeaturedChapter {
  title: string;
}

interface ContinueLearningCardProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  cardBg: string;
  featuredLesson: FeaturedLesson;
  featuredChapter: FeaturedChapter | null;
  ringTrack: string;
  openFeaturedLesson: () => void;
}

// "Continue Learning" card — the single most-recently-active (or first
// available) lesson, with a progress ring and Learn/Practice/Master stage
// dots. Caller renders this only `{featuredLesson && <ContinueLearningCard ... />}`,
// same as the pre-extraction JSX.
export function ContinueLearningCard({
  styles,
  colors,
  cardBg,
  featuredLesson,
  featuredChapter,
  ringTrack,
  openFeaturedLesson,
}: ContinueLearningCardProps) {
  return (
    <>
      <SectionHeader title="Continue Learning" sub="Pick up where you left off" />
      <TouchableOpacity
        style={[styles.clCard, { backgroundColor: cardBg, borderColor: featuredLesson.color + '30' }]}
        onPress={openFeaturedLesson}
        activeOpacity={0.86}
      >
        <View style={[styles.clStrip, { backgroundColor: featuredLesson.color }]} />
        <View style={styles.clBody}>
          <View style={styles.clTopRow}>
            <View style={{ flex: 1, gap: 5 }}>
              <View style={[styles.clSubPill, { backgroundColor: featuredLesson.color + '15', borderColor: featuredLesson.color + '35' }]}>
                <Feather name={featuredLesson.icon} size={11} color={featuredLesson.color} />
                <Text style={[styles.clSubText, { color: featuredLesson.color }]}>{featuredLesson.subject} · {featuredLesson.grade}</Text>
              </View>
              {/* Headline shows the chapter that featuredLesson.topic actually belongs
                  to (featuredChapter, resolved in the parent) — NOT always the first
                  chapter. This is what makes it advance as the student progresses: once
                  every topic in "Fables and Folk Tales" is done, featuredLesson moves on
                  to a topic in the next chapter and this headline follows it automatically. */}
              {featuredChapter ? (
                <>
                  <Text style={[styles.clTopic, { color: colors.textMain }]} numberOfLines={2}>{featuredChapter.title}</Text>
                  <Text style={[styles.clUnit, { color: colors.textMuted }]}>Next lesson: {featuredLesson.topic}</Text>
                </>
              ) : (
                <Text style={[styles.clTopic, { color: colors.textMain }]}>{featuredLesson.topic}</Text>
              )}
            </View>
            {/* Ring on right */}
            <View style={styles.clRingWrap}>
              <RingChart progress={featuredLesson.progress / 100} color={featuredLesson.color} size={68} stroke={7} track={ringTrack} />
              <View style={styles.clRingCenter}>
                <Text style={[styles.clRingPct, { color: featuredLesson.color }]}>{featuredLesson.progress}%</Text>
                <Text style={[styles.clRingDone, { color: colors.textDim }]}>done</Text>
              </View>
            </View>
          </View>

          {/* Stage dots — each stage means something specific, not just a %
              threshold on one blended "progress" number (that hid students who'd
              read the lesson but not quizzed yet: sessions-only progress was 30%,
              under the old 33% cutoff, so Learn stayed unlit even though they'd
              started):
                Learn    = has read/opened the lesson OR attempted a quiz
                Practice = has taken at least one quiz (any score)
                Master   = quiz average is ≥80% */}
          <View style={styles.stageRow}>
            {['Learn', 'Practice', 'Master'].map((s, i, arr) => {
              const stageDone = [
                featuredLesson.progress > 0 || featuredLesson.quizCount > 0,
                featuredLesson.quizCount > 0,
                featuredLesson.quizScore != null && featuredLesson.quizScore >= 80,
              ];
              const done = stageDone[i];
              return (
                <React.Fragment key={s}>
                  <View style={styles.stageNode}>
                    <View style={[styles.stageDot, { backgroundColor: done ? featuredLesson.color : colors.borderColor }]}>
                      {done && <Feather name="check" size={8} color="#fff" />}
                    </View>
                    <Text style={[styles.stageLbl, { color: done ? featuredLesson.color : colors.textDim }]}>{s}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={[styles.stageLine, { backgroundColor: done ? featuredLesson.color + '60' : colors.borderColor }]} />}
                </React.Fragment>
              );
            })}
          </View>

          {/* Bottom row */}
          <View style={styles.clBottomRow}>
            <Text style={[styles.clHint, { color: colors.textMuted }]}>
              {featuredLesson.quizScore != null && featuredLesson.quizScore >= 80 ? 'Mastered! Review to retain.'
                : featuredLesson.quizCount > 0 ? 'Quiz taken — keep practising to master it.'
                : featuredLesson.progress > 0 ? "You've read this — take the quiz to test yourself."
                : 'Start to build your foundation.'}
            </Text>
            <View style={[styles.clCtaBtn, { backgroundColor: featuredLesson.color }]}>
              <Text style={styles.clCtaTxt}>{featuredLesson.progress >= 100 ? 'Review' : featuredLesson.progress > 0 ? 'Continue' : 'Start'}</Text>
              <Feather name="arrow-right" size={12} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
}
