import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatLevel } from '../../../../context/StudentDataContext';
import { BRAND } from '../constants';
import { getGreeting } from '../utils/dashboardHelpers';
import { HeroDots, FlameIcon } from './common/icons';
import type { makeStyles } from '../DashboardScreen';

interface HeroCardProps {
  styles: ReturnType<typeof makeStyles>;
  heroAnim: Animated.Value;
  stats: { level: number; currentStreak: number };
  firstName: string;
  noContentGrade: boolean;
  studentGrade: string;
  topicsGoal: number;
  topicsMastered: number;
  t25: number;
  t50: number;
  maxLevel: number;
  levelProgress: { current: number; needed: number };
  xpGoal: number;
  navigation: { navigate: (screen: string) => void };
}

// The top hero card — greeting, level/streak badges, XP + weekly-activity
// progress bars, and the "Resume Learning Path" CTA. Pulled out of
// DashboardScreen.tsx (see that file's history) as the first component
// extraction — `styles` is passed down rather than re-derived here, since
// it's the same shared StyleSheet the rest of the screen uses.
export function HeroCard({
  styles,
  heroAnim,
  stats,
  firstName,
  noContentGrade,
  studentGrade,
  topicsGoal,
  topicsMastered,
  t25,
  t50,
  maxLevel,
  levelProgress,
  xpGoal,
  navigation,
}: HeroCardProps) {
  const done  = topicsMastered;
  const total = topicsGoal;
  const isComplete = done >= total && total > 0;
  const isNew      = done === 0;

  return (
    <Animated.View style={[{
      opacity: heroAnim,
      transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
    }]}>
      <LinearGradient
        colors={['#CDEBD7', '#DFF1E5', '#F6E6BE']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.heroCard}
      >
        <HeroDots />

        {/* Glow circles */}
        <View style={styles.heroGlowLeft} />
        <View style={styles.heroGlowRight} />

        {/* Top badges */}
        <View style={styles.heroBadgeRow}>
          <View style={styles.levelBadge}>
            <Feather name="shield" size={12} color="#BAA467" />
            <Text style={styles.levelTxt}>{formatLevel(stats.level)}</Text>
          </View>
          <View style={styles.streakBadge}>
            <FlameIcon size={13} />
            <Text style={styles.streakTxt}>{stats.currentStreak} day streak</Text>
          </View>
        </View>

        {/* Greeting */}
        <Text style={styles.heroGreeting}>{getGreeting()},</Text>
        <Text style={styles.heroName}>{firstName}</Text>
        <Text style={styles.heroSub}>
          {(() => {
            if (noContentGrade) return `Content for ${studentGrade} is on the way — we're adding it now!`;
            // Tiered so every badge threshold (Explorer 25% / Deep Diver 50% / Scholar 100%)
            // gets its own call-out — motivation shouldn't only show up at the very end.
            if (done === 0)              return `${total} chapters ready for your first sprint.`;
            if (done >= total)            return `🏆 You've nailed it! All ${total} chapters mastered — you're a true Scholar!`;
            const pct = Math.round((done / total) * 100);
            if (pct >= 80)                return `So close! ${total - done} chapter${total - done === 1 ? '' : 's'} left to become a Scholar.`;
            if (done >= t50)              return `Deep Diver unlocked! ${done} of ${total} chapters mastered — past the halfway mark!`;
            if (done >= t25)              return `Explorer unlocked! ${done} of ${total} chapters mastered — keep exploring!`;
            return `${done} of ${total} chapters mastered. Keep going!`;
          })()}
        </Text>

        {/* Level progress — driven by real XP earned toward the next level threshold
            (xpForNextLevel), NOT the weekly streak. Previously this bar filled based
            on days-active-this-week while labeled "Level 1 → 2", so nobody — including
            us — could tell how much XP was actually needed to level up. */}
        <View style={styles.xpBlock}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpLbl}>{stats.level >= maxLevel ? `Level ${maxLevel} · Max Level` : `Level ${stats.level} → ${stats.level + 1}`}</Text>
            <Text style={styles.xpNum}>
              {stats.level >= maxLevel ? `${xpGoal.toLocaleString()} XP cap` : `${levelProgress.current} / ${levelProgress.needed} XP`}
            </Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${stats.level >= maxLevel ? 100 : Math.max((levelProgress.current / levelProgress.needed) * 100, 2)}%` as any }]} />
          </View>
          <Text style={styles.xpTotal}>
            {stats.level >= maxLevel
              ? 'Max level reached for this grade!'
              : `${Math.max(levelProgress.needed - levelProgress.current, 0)} more XP to Level ${stats.level + 1}`}
          </Text>
        </View>

        {/* Weekly activity streak — separate from leveling, so the two never get conflated */}
        <View style={styles.xpBlock}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpLbl}>This week</Text>
            <Text style={styles.xpNum}>{Math.min(stats.currentStreak, 7)} of 7 days active</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.max((Math.min(stats.currentStreak, 7) / 7) * 100, 2)}%` as any }]} />
          </View>
          <Text style={styles.xpTotal}>
            {stats.currentStreak >= 7
              ? 'Perfect week — keep your streak going!'
              : `${7 - Math.min(stats.currentStreak, 7)} more day${7 - Math.min(stats.currentStreak, 7) === 1 ? '' : 's'} to a full week streak!`}
          </Text>
        </View>

        {/* CTA — label and destination change based on completion state */}
        <TouchableOpacity
          style={styles.heroCta}
          onPress={() => navigation.navigate(isComplete ? 'Challenges' : 'LearningPaths')}
          activeOpacity={0.85}
        >
          <View style={styles.heroCtaPlay}>
            <Feather name={isComplete ? 'award' : 'play'} size={13} color={BRAND.indigo} />
          </View>
          <Text style={styles.heroCtaTxt}>
            {isComplete ? 'Explore Challenges' : isNew ? 'Start Learning' : 'Resume Learning Path'}
          </Text>
          <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.55)" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}
