import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { Story } from '../../../../services/currentAffairsApi';
import {
  GOLD, SAGE, DEEP_SAGE, TINT_BG, TITLE_LIGHT, AGE_GROUPS, POINTS, formatReadTime, formatDigestDate,
} from '../constants';
import type { DigestState } from '../hooks/useDigest';
import CategoryBadge from './CategoryBadge';

interface Props {
  state: DigestState;
  navigation: any;
  /** The World & You already shows the date, so it hides this row. */
  showDateRow?: boolean;
}

// Today's Current Affairs: stats, daily target, story cards, "I've read all
// stories" and the Weekly Quiz card. Shown on the Current Affairs page and in
// The World & You's Current Affairs tab; the parent provides the scroll view.
export default function DigestContent({ state, navigation, showDateRow = true }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const titleColor = isDark ? colors.textMain : TITLE_LIGHT;
  const { email, ageGroup, digest, progress, loading, error, completing, completeMessage, load, complete } = state;

  const openStory = (story: Story) => navigation.navigate('CurrentAffairsStory', { storyId: story.id, ageGroup });
  const openQuiz = () => navigation.navigate('CurrentAffairsQuiz', { ageGroup });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="digest-loading" size="large" color={GOLD} />
      </View>
    );
  }

  if (error && !digest) {
    return (
      <View style={styles.center}>
        <Feather name="wifi-off" size={28} color={colors.textDim} />
        <Text style={[styles.hint, { color: colors.textMuted }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: GOLD + '60' }]}
          onPress={() => load('retry')}
          accessibilityRole="button"
        >
          <Feather name="refresh-cw" size={13} color={GOLD} />
          <Text style={[styles.outlineBtnText, { color: GOLD }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stories = digest?.stories || [];
  const readCount = stories.filter((s) => s.read).length;
  const allRead = stories.length > 0 && readCount === stories.length;
  const badgeCount = progress ? Object.values(progress.badges).filter(Boolean).length : 0;
  const totalMinutes = Math.max(1, Math.round(stories.reduce((n, s) => n + (s.readTimeSeconds || 0), 0) / 60));

  return (
    <View style={styles.wrap}>
      {showDateRow ? (
        <View style={styles.dateRow}>
          <Feather name="calendar" size={13} color={GOLD} />
          <Text style={[styles.dateText, { color: GOLD }]}>{formatDigestDate(digest?.date || null) || 'Today'}</Text>
          <Text style={[styles.ageText, { color: colors.textMuted }]}>{AGE_GROUPS[ageGroup].label}</Text>
        </View>
      ) : null}

      {/* Stats — same tiles as Daily Habits */}
      <View style={styles.statsRow}>
        <StatTile styles={styles} icon="zap" color={GOLD} value={progress?.currentStreak ?? 0} label="Day Streak" muted={colors.textMuted} />
        <StatTile styles={styles} icon="star" color={SAGE} value={progress?.points ?? 0} label="Points" muted={colors.textMuted} />
        <StatTile styles={styles} icon="award" color={DEEP_SAGE} value={badgeCount} label="Badges" muted={colors.textMuted} />
      </View>

      {/* Today's target */}
      <View style={[styles.card, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
        <View style={styles.progressTop}>
          <Text style={[styles.progressTitle, { color: colors.textMain }]} testID="digest-read-count">
            {stories.length
              ? `${readCount} of ${stories.length} ${stories.length === 1 ? 'story' : 'stories'} read`
              : `${AGE_GROUPS[ageGroup].storiesPerDay} stories a day`}
          </Text>
          <Text style={[styles.progressPoints, { color: GOLD }]}>
            {stories.length ? `about ${totalMinutes} min` : `${AGE_GROUPS[ageGroup].minutes} min`}
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.borderColor }]}>
          <View style={[styles.fill, {
            width: `${stories.length ? Math.round((readCount / stories.length) * 100) : 0}%`,
            backgroundColor: allRead ? DEEP_SAGE : SAGE,
          }]} />
        </View>
        {digest && !digest.isToday && digest.date ? (
          <View style={styles.noteRow}>
            <Feather name="info" size={12} color={colors.textMuted} />
            <Text style={[styles.noteText, { color: colors.textMuted }]}>
              No new stories yet today — here is the digest from {formatDigestDate(digest.date)}.
            </Text>
          </View>
        ) : null}
      </View>

      {error ? <Text style={[styles.hint, { color: colors.accentRed }]}>{error}</Text> : null}

      <Text style={[styles.sectionTitle, { color: GOLD }]}>TODAY&apos;S STORIES</Text>

      {stories.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
          <View style={[styles.iconCircle, { backgroundColor: GOLD + '20' }]}>
            <Feather name="radio" size={16} color={GOLD} />
          </View>
          <Text style={[styles.emptyTitle, { color: titleColor }]}>No stories yet</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>Today’s digest is being prepared. Check back soon!</Text>
        </View>
      ) : stories.map((story) => (
        <TouchableOpacity
          key={story.id}
          testID={`story-card-${story.id}`}
          style={[styles.storyCard, { backgroundColor: colors.cardDark, borderColor: story.read ? SAGE + '60' : colors.borderColor }]}
          onPress={() => openStory(story)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${story.title}${story.read ? ', read' : ''}`}
        >
          <View style={styles.storyTop}>
            <CategoryBadge category={story.category} />
            <View
              testID={story.read ? `story-read-${story.id}` : `story-unread-${story.id}`}
              style={[styles.checkbox, story.read
                ? { backgroundColor: SAGE, borderColor: SAGE }
                : { borderColor: colors.borderColor }]}
            >
              {story.read ? <Feather name="check" size={12} color="#fff" /> : null}
            </View>
          </View>
          <Text style={[styles.storyTitle, { color: titleColor }]}>{story.title}</Text>
          <Text style={[styles.storySummary, { color: colors.textMuted }]}>{story.summary}</Text>
          <View style={styles.metaRow}>
            <Feather name="clock" size={11} color={colors.textDim} />
            <Text style={[styles.metaText, { color: colors.textDim }]}>{formatReadTime(story.readTimeSeconds)} · {story.source}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Finish the digest */}
      {stories.length > 0 && email ? (
        digest?.completed ? (
          <View style={[styles.banner, { backgroundColor: SAGE + '15', borderColor: SAGE + '35' }]} testID="digest-completed">
            <View style={[styles.bannerIcon, { backgroundColor: SAGE + '25' }]}>
              <Feather name="check-circle" size={14} color={DEEP_SAGE} />
            </View>
            <Text style={[styles.bannerText, { color: DEEP_SAGE }]}>Today’s digest is complete. See you tomorrow!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: GOLD }, completing && styles.disabled]}
            onPress={complete}
            disabled={completing}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {completing ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Feather name="check-square" size={14} color="#fff" />
                <Text style={styles.primaryBtnText}>I’ve read all stories (+{POINTS.digest} points)</Text>
              </>
            )}
          </TouchableOpacity>
        )
      ) : null}
      {completeMessage ? <Text style={[styles.hint, { color: colors.textMain }]}>{completeMessage}</Text> : null}

      {/* Weekly quiz — card in the World & You style */}
      <TouchableOpacity
        style={[styles.card, styles.quizCard, {
          backgroundColor: isDark ? colors.cardDark : TINT_BG,
          borderColor: isDark ? colors.borderColor : GOLD + '25',
        }]}
        onPress={openQuiz}
        activeOpacity={0.85}
        accessibilityRole="button"
        testID="weekly-quiz-cta"
      >
        <View style={[styles.iconCircle, { backgroundColor: GOLD + '20' }]}>
          <Feather name="help-circle" size={16} color={GOLD} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: titleColor }]}>Weekly Quiz</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>10 questions on this week’s news · +{POINTS.quiz} points</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function StatTile({ styles, icon, color, value, label, muted }: {
  styles: ReturnType<typeof makeStyles>; icon: any; color: string; value: number; label: string; muted: string;
}) {
  return (
    <LinearGradient
      colors={[color + '30', color + '10']}
      style={[styles.statCard, { borderColor: color + '40' }]}
      accessibilityLabel={`${value} ${label}`}
    >
      <Feather name={icon} size={20} color={color} />
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
    </LinearGradient>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  wrap: { gap: spacing.md },
  center: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  hint: { fontSize: 13, textAlign: 'center' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, fontWeight: '700' },
  ageText: { marginLeft: 'auto', fontSize: 12 },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg, borderRadius: radius.xl, borderWidth: 1, gap: 4 },
  statNum: { fontSize: 22, fontWeight: '800', fontFamily: fonts.serif },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 13, fontWeight: '700' },
  progressPoints: { fontSize: 13, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  noteText: { flex: 1, fontSize: 12 },

  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.xs },

  storyCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  storyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  storyTitle: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  storySummary: { fontSize: 13, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11 },

  emptyBox: { alignItems: 'center', paddingVertical: 40, borderRadius: radius.xl, borderWidth: 1, gap: 10, backgroundColor: c.cardDark },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 20 },

  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  quizCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSub: { fontSize: 11, marginTop: 1 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, minHeight: 44,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 10, borderWidth: 1,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '700' },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  bannerIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
});
