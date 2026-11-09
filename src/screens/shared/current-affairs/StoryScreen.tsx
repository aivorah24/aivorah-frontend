import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { spacing, radius } from '../../../theme';
import type { AppColors } from '../../../theme';
import { fetchStory, recordStoryRead, type AgeGroup, type Story } from '../../../services/currentAffairsApi';
import { GOLD, SAGE, DEEP_SAGE, TITLE_LIGHT, CATEGORIES, POINTS, ageGroupForGrade, formatReadTime } from './constants';
import CategoryBadge from './components/CategoryBadge';

export default function StoryScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { isMobile } = useResponsive();
  const styles = useMemo(() => makeStyles(colors, isMobile), [colors, isMobile]);
  const titleColor = isDark ? colors.textMain : TITLE_LIGHT;

  const storyId: string | undefined = route?.params?.storyId;
  const ageGroup: AgeGroup = route?.params?.ageGroup || ageGroupForGrade(user?.grade);
  const email = user?.email || undefined;

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [readMessage, setReadMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const openedAt = useRef(0); // set when the story loads

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReadMessage(null);
    setDone(false);
    openedAt.current = Date.now();
    if (!storyId) {
      setStory(null);
      setError('Story not found');
      setLoading(false);
      return;
    }
    try {
      setStory(await fetchStory(storyId, ageGroup));
    } catch (e: any) {
      setError(e?.message || 'Could not load the story');
    } finally {
      setLoading(false);
    }
  }, [storyId, ageGroup]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goBack = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate('CurrentAffairs');
  };

  const markRead = async () => {
    if (!email || !story) return;
    setSaving(true);
    try {
      const seconds = Math.round((Date.now() - openedAt.current) / 1000);
      const result = await recordStoryRead(email, ageGroup, story.id, seconds);
      setDone(true);
      setReadMessage(result.alreadyRead ? 'You have read this story before.' : `Great reading! +${result.pointsAwarded} points`);
    } catch (e: any) {
      setReadMessage(e?.message || 'Could not save your progress');
    } finally {
      setSaving(false);
    }
  };

  const backButton = (
    <TouchableOpacity style={[styles.outlineBtn, { borderColor: GOLD + '60' }]} onPress={goBack} accessibilityRole="button">
      <Feather name="arrow-left" size={13} color={GOLD} />
      <Text style={[styles.outlineBtnText, { color: GOLD }]}>Back to today’s stories</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Current Affairs"
          subtitle={story ? CATEGORIES[story.category]?.label : 'Story'}
          showSearch={false}
          showBack
          onBack={goBack}
          onMenuPress={() => navigation.openDrawer?.()}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator testID="story-loading" size="large" color={GOLD} />
            </View>
          ) : error || !story ? (
            <View style={styles.center}>
              <Feather name="alert-circle" size={28} color={colors.textDim} />
              <Text style={[styles.hint, { color: colors.textMuted }]}>{error || 'Story not found'}</Text>
              {backButton}
            </View>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
                <CategoryBadge category={story.category} />
                <Text style={[styles.title, { color: titleColor }]}>{story.title}</Text>
                <View style={styles.metaRow}>
                  <Feather name="clock" size={11} color={colors.textDim} />
                  <Text style={[styles.metaText, { color: colors.textDim }]}>{formatReadTime(story.readTimeSeconds)} · {story.source}</Text>
                </View>
              </View>

              <Section styles={styles} colors={colors} titleColor={titleColor} icon="book-open" color={GOLD} title="What happened?">
                <Text style={[styles.body, { color: colors.textMain }]}>{story.whatHappened}</Text>
              </Section>

              <Section styles={styles} colors={colors} titleColor={titleColor} icon="star" color={SAGE} title="Why is it important?">
                <Text style={[styles.body, { color: colors.textMain }]}>{story.whyImportant}</Text>
              </Section>

              {story.didYouKnow ? (
                <Section styles={styles} colors={colors} titleColor={titleColor} icon="zap" color={GOLD} title="Did you know?">
                  <Text style={[styles.body, { color: colors.textMain }]}>{story.didYouKnow}</Text>
                </Section>
              ) : null}

              {story.newWords.length ? (
                <Section styles={styles} colors={colors} titleColor={titleColor} icon="bookmark" color={DEEP_SAGE} title="Learn a new word">
                  {story.newWords.map((w) => (
                    <Text key={w.word} style={[styles.body, { color: colors.textMain }]}>
                      <Text style={[styles.word, { color: DEEP_SAGE }]}>{w.word}: </Text>{w.definition}
                    </Text>
                  ))}
                </Section>
              ) : null}

              {story.thinkAboutIt ? (
                <Section styles={styles} colors={colors} titleColor={titleColor} icon="message-circle" color={GOLD} title="Think about it">
                  <Text style={[styles.body, { color: colors.textMain }]}>{story.thinkAboutIt}</Text>
                </Section>
              ) : null}

              {story.sourceUrl ? (
                <TouchableOpacity style={styles.sourceRow} onPress={() => Linking.openURL(story.sourceUrl!)} accessibilityRole="link">
                  <Feather name="external-link" size={12} color={GOLD} />
                  <Text style={[styles.sourceLink, { color: GOLD }]}>Read the original at {story.source}</Text>
                </TouchableOpacity>
              ) : null}

              {email ? (
                done ? (
                  <View style={[styles.banner, { backgroundColor: SAGE + '15', borderColor: SAGE + '35' }]} testID="story-done">
                    <View style={[styles.bannerIcon, { backgroundColor: SAGE + '25' }]}>
                      <Feather name="check-circle" size={14} color={DEEP_SAGE} />
                    </View>
                    <Text style={[styles.bannerText, { color: DEEP_SAGE }]}>{readMessage}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: GOLD }, saving && styles.disabled]}
                    onPress={markRead}
                    disabled={saving}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Feather name="check-square" size={14} color="#fff" />
                        <Text style={styles.primaryBtnText}>I’ve read this (+{POINTS.story} points)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )
              ) : null}
              {readMessage && !done ? <Text style={[styles.hint, { color: colors.accentRed }]}>{readMessage}</Text> : null}

              {backButton}
            </>
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

function Section({ styles, colors, titleColor, icon, color, title, children }: {
  styles: ReturnType<typeof makeStyles>; colors: AppColors; titleColor: string;
  icon: any; color: string; title: string; children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
          <Feather name={icon} size={14} color={color} />
        </View>
        <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const makeStyles = (c: AppColors, isMobile: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  content: { padding: isMobile ? spacing.lg : spacing.xl, paddingBottom: 56, gap: spacing.md },
  center: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  hint: { fontSize: 13, textAlign: 'center' },

  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: isMobile ? 18 : 20, fontWeight: '800', lineHeight: isMobile ? 24 : 27 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 22 },
  word: { fontWeight: '800' },

  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  sourceLink: { fontSize: 13, fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, minHeight: 44,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7,
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '700' },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  bannerIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
});
