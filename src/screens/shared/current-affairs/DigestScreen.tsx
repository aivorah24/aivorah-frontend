import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { spacing, radius } from '../../../theme';
import type { AppColors } from '../../../theme';
import {
  fetchTodayDigest, fetchProgress, recordDigestComplete,
  type Digest, type Progress, type Story,
} from '../../../services/currentAffairsApi';
import {
  BRAND, CATEGORIES, AGE_GROUPS, POINTS, ageGroupForGrade, categoryColors, formatReadTime, formatDigestDate,
} from './constants';

export default function DigestScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { isMobile } = useResponsive();
  const styles = useMemo(() => makeStyles(colors, isMobile), [colors, isMobile]);

  const email = user?.email || undefined;
  const ageGroup = ageGroupForGrade(user?.grade);

  const [digest, setDigest] = useState<Digest | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'focus' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    try {
      const [d, p] = await Promise.all([
        fetchTodayDigest(ageGroup, email),
        // Progress is a nice-to-have: the stories still show if it fails.
        email ? fetchProgress(email, ageGroup).catch(() => null) : Promise.resolve(null),
      ]);
      setDigest(d);
      if (p) setProgress(p);
    } catch (e: any) {
      setError(e?.message || "Could not load today's stories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ageGroup, email]);

  // Reload on every focus so stories read in StoryScreen show as checked.
  useFocusEffect(useCallback(() => { load('focus'); }, [load]));

  const onComplete = async () => {
    if (!email || !digest) return;
    setCompleting(true);
    setCompleteMessage(null);
    try {
      const result = await recordDigestComplete(email, ageGroup, digest.stories.length);
      setProgress(result.progress);
      setDigest({ ...digest, completed: true });
      setCompleteMessage(result.alreadyCompleted
        ? "You already finished today's digest."
        : `Well done! +${result.pointsAwarded} points${result.newBadges.includes('weekly_streak') ? ' and a 7-day streak badge!' : ''}`);
    } catch (e: any) {
      setCompleteMessage(e?.message || 'Could not save your progress');
    } finally {
      setCompleting(false);
    }
  };

  const openStory = (story: Story) => navigation.navigate('CurrentAffairsStory', { storyId: story.id, ageGroup });
  const openQuiz = () => navigation.navigate('CurrentAffairsQuiz', { ageGroup });

  const stories = digest?.stories || [];
  const readCount = stories.filter((s) => s.read).length;
  const badgeCount = progress ? Object.values(progress.badges).filter(Boolean).length : 0;
  const totalMinutes = Math.max(1, Math.round(stories.reduce((n, s) => n + (s.readTimeSeconds || 0), 0) / 60));

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Current Affairs"
          subtitle={`Daily digest · ${AGE_GROUPS[ageGroup].label}`}
          showSearch={false}
          onMenuPress={() => navigation.openDrawer?.()}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator testID="digest-loading" size="large" color={BRAND.gold} />
            <Text style={styles.muted}>Loading today’s stories…</Text>
          </View>
        ) : error && !digest ? (
          <View style={styles.center}>
            <Feather name="wifi-off" size={36} color={colors.textMuted} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => { setLoading(true); load(); }} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            testID="digest-scroll"
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={BRAND.gold} />}
          >
            {/* Progress row */}
            <View style={styles.statsRow}>
              <Stat styles={styles} icon="star" color={BRAND.gold} value={progress?.points ?? 0} label="Points" />
              <Stat styles={styles} icon="zap" color={BRAND.orange} value={progress?.currentStreak ?? 0} label="Day streak" />
              <Stat styles={styles} icon="award" color={BRAND.purple} value={badgeCount} label="Badges" />
            </View>

            {/* Daily target */}
            <View style={styles.targetCard}>
              <View style={styles.targetHeader}>
                <Text style={styles.targetTitle}>Today’s target</Text>
                <Text style={styles.targetCount} testID="digest-read-count">{readCount}/{stories.length} read</Text>
              </View>
              <Text style={styles.muted}>
                {stories.length
                  ? `Read ${stories.length} ${stories.length === 1 ? 'story' : 'stories'} · about ${totalMinutes} min`
                  : `${AGE_GROUPS[ageGroup].storiesPerDay} stories a day · ${AGE_GROUPS[ageGroup].minutes} min`}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${stories.length ? Math.round((readCount / stories.length) * 100) : 0}%` }]} />
              </View>
              {digest && !digest.isToday && digest.date ? (
                <Text style={styles.note}>No new stories yet today — here is the digest from {formatDigestDate(digest.date)}.</Text>
              ) : null}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Stories */}
            {stories.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📰</Text>
                <Text style={styles.emptyTitle}>No stories yet</Text>
                <Text style={styles.muted}>Today’s digest is being prepared. Check back soon!</Text>
              </View>
            ) : stories.map((story) => {
              const cat = CATEGORIES[story.category];
              const tone = categoryColors(story.category, isDark);
              return (
                <TouchableOpacity
                  key={story.id}
                  testID={`story-card-${story.id}`}
                  style={styles.storyCard}
                  onPress={() => openStory(story)}
                  accessibilityRole="button"
                  accessibilityLabel={`${story.title}${story.read ? ', read' : ''}`}
                >
                  <View style={styles.storyTop}>
                    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.badgeText, { color: tone.fg }]}>{cat?.emoji} {cat?.label || story.category}</Text>
                    </View>
                    <Feather
                      testID={story.read ? `story-read-${story.id}` : `story-unread-${story.id}`}
                      name={story.read ? 'check-circle' : 'circle'}
                      size={20}
                      color={story.read ? BRAND.forest : colors.textDim}
                    />
                  </View>
                  <Text style={styles.storyTitle}>{story.title}</Text>
                  <Text style={styles.storySummary}>{story.summary}</Text>
                  <Text style={styles.storyMeta}>{story.source} · {formatReadTime(story.readTimeSeconds)}</Text>
                </TouchableOpacity>
              );
            })}

            {/* Finish the digest */}
            {stories.length > 0 && email ? (
              digest?.completed ? (
                <View style={[styles.primaryButton, styles.doneButton]} testID="digest-completed">
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Today’s digest is complete</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryButton, completing && styles.disabled]}
                  onPress={onComplete}
                  disabled={completing}
                  accessibilityRole="button"
                >
                  {completing
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryButtonText}>I’ve read all stories (+{POINTS.digest} points)</Text>}
                </TouchableOpacity>
              )
            ) : null}
            {completeMessage ? <Text style={styles.completeMessage}>{completeMessage}</Text> : null}

            {/* Weekly quiz */}
            <TouchableOpacity style={styles.quizCard} onPress={openQuiz} accessibilityRole="button" testID="weekly-quiz-cta">
              <Text style={styles.quizEmoji}>🧠</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.quizTitle}>Weekly Quiz</Text>
                <Text style={styles.quizText}>10 questions on this week’s news · +{POINTS.quiz} points</Text>
              </View>
              <Feather name="chevron-right" size={22} color={BRAND.purple} />
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}

function Stat({ styles, icon, color, value, label }: { styles: ReturnType<typeof makeStyles>; icon: any; color: string; value: number; label: string }) {
  return (
    <View style={styles.stat} accessibilityLabel={`${value} ${label}`}>
      <Feather name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: AppColors, isMobile: boolean) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: isMobile ? spacing.lg : spacing.xxl, paddingBottom: spacing.xxxl * 2, gap: spacing.md, maxWidth: 860, width: '100%', alignSelf: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
    muted: { color: colors.textMuted, fontSize: 14 },
    errorText: { color: BRAND.rose, fontSize: 14, textAlign: 'center' },
    note: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, fontStyle: 'italic' },

    statsRow: { flexDirection: 'row', gap: spacing.md },
    stat: {
      flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, gap: 2,
    },
    statValue: { color: colors.textMain, fontSize: 20, fontWeight: '700' },
    statLabel: { color: colors.textMuted, fontSize: 12 },

    targetCard: { backgroundColor: colors.cardDark, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderColor, gap: spacing.xs },
    targetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    targetTitle: { color: colors.textHeading, fontSize: 17, fontWeight: '700' },
    targetCount: { color: BRAND.gold, fontSize: 14, fontWeight: '700' },
    barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.borderColor, overflow: 'hidden', marginTop: spacing.sm },
    barFill: { height: 8, borderRadius: 4, backgroundColor: BRAND.gold },

    storyCard: { backgroundColor: colors.cardDark, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderColor, gap: spacing.sm },
    storyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
    badgeText: { fontSize: 12, fontWeight: '700' },
    storyTitle: { color: colors.textHeading, fontSize: 17, fontWeight: '700' },
    storySummary: { color: colors.textMain, fontSize: 14, lineHeight: 20 },
    storyMeta: { color: colors.textDim, fontSize: 12 },

    emptyCard: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm, backgroundColor: colors.cardDark, borderRadius: radius.lg },
    emptyEmoji: { fontSize: 36 },
    emptyTitle: { color: colors.textHeading, fontSize: 17, fontWeight: '700' },

    primaryButton: {
      flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center',
      backgroundColor: BRAND.gold, borderRadius: radius.md, paddingVertical: spacing.md, minHeight: 48,
    },
    doneButton: { backgroundColor: BRAND.forest },
    primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.6 },
    completeMessage: { color: colors.textMain, textAlign: 'center', fontSize: 14 },
    secondaryButton: { borderWidth: 1, borderColor: BRAND.gold, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
    secondaryButtonText: { color: BRAND.gold, fontWeight: '700' },

    quizCard: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg,
      backgroundColor: colors.cardDark, borderWidth: 2, borderColor: BRAND.purple, marginTop: spacing.sm,
    },
    quizEmoji: { fontSize: 30 },
    quizTitle: { color: colors.textHeading, fontSize: 17, fontWeight: '700' },
    quizText: { color: colors.textMuted, fontSize: 13 },
  });
}
