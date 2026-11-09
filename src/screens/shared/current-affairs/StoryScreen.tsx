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
import { BRAND, PASTEL, CATEGORIES, POINTS, ageGroupForGrade, categoryColors, formatReadTime } from './constants';

type Tone = keyof typeof BRAND;

export default function StoryScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { isMobile } = useResponsive();
  const styles = useMemo(() => makeStyles(colors, isMobile), [colors, isMobile]);

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

  const cat = story ? CATEGORIES[story.category] : null;
  const tone = story ? categoryColors(story.category, isDark) : null;

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Current Affairs" subtitle="Story" showSearch={false} showBack onBack={goBack} onMenuPress={goBack} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator testID="story-loading" size="large" color={BRAND.gold} />
          </View>
        ) : error || !story ? (
          <View style={styles.center}>
            <Feather name="alert-circle" size={36} color={colors.textMuted} />
            <Text style={styles.errorText}>{error || 'Story not found'}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={goBack} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Back to today’s stories</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.badge, { backgroundColor: tone!.bg }]}>
              <Text style={[styles.badgeText, { color: tone!.fg }]}>{cat?.emoji} {cat?.label}</Text>
            </View>
            <Text style={styles.title}>{story.title}</Text>
            <Text style={styles.meta}>{story.source} · {formatReadTime(story.readTimeSeconds)}</Text>

            <Section styles={styles} isDark={isDark} icon="book-open" tone="blue" title="What happened?">
              <Text style={styles.body}>{story.whatHappened}</Text>
            </Section>

            <Section styles={styles} isDark={isDark} icon="star" tone="orange" title="Why is it important?">
              <Text style={styles.body}>{story.whyImportant}</Text>
            </Section>

            {story.didYouKnow ? (
              <Section styles={styles} isDark={isDark} icon="zap" tone="purple" title="Did you know?">
                <Text style={styles.body}>{story.didYouKnow}</Text>
              </Section>
            ) : null}

            {story.newWords.length ? (
              <Section styles={styles} isDark={isDark} icon="bookmark" tone="forest" title="Learn a new word">
                {story.newWords.map((w) => (
                  <Text key={w.word} style={styles.body}>
                    <Text style={styles.word}>{w.word}: </Text>{w.definition}
                  </Text>
                ))}
              </Section>
            ) : null}

            {story.thinkAboutIt ? (
              <Section styles={styles} isDark={isDark} icon="message-circle" tone="teal" title="Think about it">
                <Text style={styles.body}>{story.thinkAboutIt}</Text>
              </Section>
            ) : null}

            {story.sourceUrl ? (
              <TouchableOpacity onPress={() => Linking.openURL(story.sourceUrl!)} accessibilityRole="link">
                <Text style={styles.sourceLink}>Read the original at {story.source}</Text>
              </TouchableOpacity>
            ) : null}

            {email ? (
              done ? (
                <View style={[styles.primaryButton, styles.doneButton]} testID="story-done">
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Read</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryButton, saving && styles.disabled]}
                  onPress={markRead}
                  disabled={saving}
                  accessibilityRole="button"
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryButtonText}>I’ve read this (+{POINTS.story} points)</Text>}
                </TouchableOpacity>
              )
            ) : null}
            {readMessage ? <Text style={styles.readMessage}>{readMessage}</Text> : null}

            <TouchableOpacity style={styles.secondaryButton} onPress={goBack} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Back to today’s stories</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}

function Section({ styles, isDark, icon, tone, title, children }: {
  styles: ReturnType<typeof makeStyles>; isDark: boolean; icon: any; tone: Tone; title: string; children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: isDark ? `${BRAND[tone]}1F` : PASTEL[tone], borderLeftColor: BRAND[tone] }]}>
      <View style={styles.sectionHeader}>
        <Feather name={icon} size={18} color={BRAND[tone]} />
        <Text style={[styles.sectionTitle, { color: BRAND[tone] }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function makeStyles(colors: AppColors, isMobile: boolean) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: isMobile ? spacing.lg : spacing.xxl, paddingBottom: spacing.xxxl * 2, gap: spacing.md, maxWidth: 760, width: '100%', alignSelf: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
    errorText: { color: BRAND.rose, fontSize: 15, textAlign: 'center' },
    badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
    badgeText: { fontSize: 12, fontWeight: '700' },
    title: { color: colors.textHeading, fontSize: isMobile ? 22 : 26, fontWeight: '800', lineHeight: isMobile ? 28 : 32 },
    meta: { color: colors.textDim, fontSize: 13 },
    section: { borderRadius: radius.md, padding: spacing.lg, borderLeftWidth: 4, gap: spacing.sm },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    sectionTitle: { fontSize: 15, fontWeight: '800' },
    body: { color: colors.textMain, fontSize: 16, lineHeight: 24 },
    word: { fontWeight: '800' },
    sourceLink: { color: BRAND.blue, fontSize: 14, textDecorationLine: 'underline' },
    primaryButton: {
      flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center',
      backgroundColor: BRAND.gold, borderRadius: radius.md, paddingVertical: spacing.md, minHeight: 48, marginTop: spacing.sm,
    },
    doneButton: { backgroundColor: BRAND.forest },
    primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.6 },
    readMessage: { color: colors.textMain, textAlign: 'center', fontSize: 14 },
    secondaryButton: { alignSelf: 'center', borderWidth: 1, borderColor: BRAND.gold, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
    secondaryButtonText: { color: BRAND.gold, fontWeight: '700' },
  });
}
