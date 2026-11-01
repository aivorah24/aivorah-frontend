import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useStudentData } from '../../../context/StudentDataContext';
import { useAuth } from '../../../context/AuthContext';
import { useResponsive } from '../../../hooks/useResponsive';

import { NO_CONTENT_GRADES } from './constants';
import { makeStyles } from './styles';
import { useSubjects } from './hooks/useSubjects';
import { useBlockedSubjects } from './hooks/useBlockedSubjects';
import { useRefreshOnFocus } from './subject-syllabus/hooks/useRefreshOnFocus';
import { useSubjectTopics } from './hooks/useSubjectTopics';
import SubjectCard from './components/SubjectCard';
import { useTeacherPaths } from './teacher-learning-paths/hooks/useTeacherPaths';
import { mergeTeacherSubjects } from './mergeTeacherSubjects';
import { curriculumFlags } from './utils';

export default function LearningPathsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isMobile } = useResponsive();
  const { stats } = useStudentData();
  const { user, refreshProfile } = useAuth();

  const curriculum = user?.curriculum ?? '';
  const grade = user?.grade ?? '';

  // Re-sync grade/curriculum on focus — e.g. a parent editing this child's grade
  // elsewhere would otherwise leave this screen showing the OLD grade's content
  // until the student happened to visit Dashboard/Settings first (same fix
  // already applied there and in Challenges).
  useFocusEffect(useCallback(() => { refreshProfile().catch(() => {}); }, [refreshProfile]));
  const { isPYP, isCBSE } = curriculumFlags(curriculum);

  const { subjects: courseSubjects, loading, error } = useSubjects(curriculum, grade, isCBSE, isPYP);
  // Teacher-published units count as chapters of their subject; a subject the curriculum has no card for (IB has
  // no standard syllabus) gets its own card built from them.
  const { paths: teacherPaths } = useTeacherPaths(grade);
  const mergedSubjects = useMemo(
    () => mergeTeacherSubjects(courseSubjects, teacherPaths, grade),
    [courseSubjects, teacherPaths, grade],
  );
  const blockedSubjects = useBlockedSubjects(user?.email, useRefreshOnFocus(navigation));

  const completedSet = useMemo(() => new Set(stats.completedTopics ?? []), [stats.completedTopics]);
  const subjects = useSubjectTopics(mergedSubjects, curriculum, grade, completedSet.size > 0);

  const cardWidth = (isMobile ? '100%' : '48.7%') as `${number}%`;

  const totals = useMemo(() => {
    const totalTopics = subjects.reduce((acc, s) => acc + s.topicCount, 0);
    const doneTopics = subjects.reduce(
      (acc, s) => acc + s.topics.reduce((sum, t) => sum + (completedSet.has(t.topic) ? 1 : 0), 0),
      0,
    );
    const cappedDone = Math.min(doneTopics, totalTopics);
    const overallPct = totalTopics > 0 ? Math.round((cappedDone / totalTopics) * 100) : 0;
    return { totalTopics, doneTopics: cappedDone, overallPct };
  }, [subjects, completedSet]);

  const heroName = user?.name?.split(' ')[0] ?? 'Student';
  // Raw topic counts (e.g. "0/2350 topics completed") read as discouraging for a
  // brand-new student and don't map to how the syllabus is actually organised
  // for them (units/chapters, not a flat topic tally) — client asked to swap
  // this for a subject-progress framing instead. True unit-level completion
  // isn't tracked on the student side yet (syllabus_chapters/unit_no exists
  // server-side for teacher import only) — that would need a new endpoint.
  const subjectsInProgress = subjects.filter((s) => s.topics.some((t) => completedSet.has(t.topic))).length;
  const heroSubtitle = subjects.length > 0
    ? `${subjectsInProgress}/${subjects.length} subjects in progress`
    : '';

  // Guard: if grade or curriculum is missing, the user's profile is incomplete.
  // Never silently show wrong curriculum content — prompt them to complete setup.
  if (!grade || !curriculum) {
    return (
      <ScreenLayout>
        <View style={[styles.screen, styles.center]}>
          <Feather name="alert-circle" size={38} color={colors.textDim} />
          <Text style={[styles.dimText, { marginTop: 12, textAlign: 'center', maxWidth: 340 }]}>
            Your profile is incomplete. Please update your grade and curriculum in Settings to see your learning paths.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.accentYellow }}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Go to Settings</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  // No content ingested for this grade yet (e.g. Early Years) — show a polished
  // "coming soon" message instead of another grade's topics.
  if (NO_CONTENT_GRADES.includes(grade)) {
    return (
      <ScreenLayout>
        <View style={styles.screen}>
          <Header title="My Learning Journey" subtitle={`${isCBSE ? 'CBSE' : curriculum} - ${grade}`} onMenuPress={() => navigation.openDrawer()} />
          <View style={[styles.center, { flex: 1, paddingHorizontal: 28 }]}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.accentYellow + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Feather name="book-open" size={32} color={colors.accentYellow} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textMain, textAlign: 'center', marginBottom: 10 }}>
              Content for {grade} is on the way
            </Text>
            <Text style={[styles.dimText, { textAlign: 'center', maxWidth: 440, lineHeight: 21 }]}>
              We&apos;re carefully crafting age-appropriate learning content for {grade}. It will appear here as soon as it&apos;s ready. Thank you for your patience!
            </Text>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <View style={[styles.screen, styles.center]}>
          <Feather name="wifi-off" size={38} color={colors.textDim} />
          <Text style={[styles.dimText, { marginTop: 12, textAlign: 'center', maxWidth: 420 }]}>{error}</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="My Learning Journey"
          subtitle={`${isCBSE ? 'CBSE' : curriculum} - ${grade}`}
          onMenuPress={() => navigation.openDrawer()}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={[colors.accentYellow + '35', colors.accentYellow + '20', colors.cardDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: colors.accentYellow + '45' }]}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroTitleWrap}>
                <Text style={styles.heroEyebrow}>Dashboard</Text>
                <Text style={styles.heroTitle}>{heroName}, keep the streak alive</Text>
                <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
              </View>
              <View style={[styles.heroProgress, { borderColor: colors.accentYellow + '65' }]}>
                <Text style={[styles.heroProgressValue, { color: colors.accentYellow }]}>{totals.overallPct}%</Text>
                <Text style={styles.heroProgressLabel}>overall</Text>
              </View>
            </View>
            <View style={styles.heroMetaRow}>
              <View style={[styles.heroMetaChip, { borderColor: colors.borderColor }]}>
                <Feather name="book" size={12} color={colors.textMuted} />
                <Text style={styles.heroMetaText}>{curriculum}</Text>
              </View>
              <View style={[styles.heroMetaChip, { borderColor: colors.borderColor }]}>
                <Feather name="layers" size={12} color={colors.textMuted} />
                <Text style={styles.heroMetaText}>{grade}</Text>
              </View>
            </View>
          </LinearGradient>

          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Subjects</Text>
              <Text style={styles.sectionSub}>Choose what to study next</Text>
            </View>

            {loading && subjects.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="small" color={colors.accentYellow} />
                <Text style={styles.dimText}>Loading {isCBSE ? 'CBSE' : curriculum} subjects…</Text>
              </View>
            ) : (
              <View style={styles.subjectGrid}>
                {subjects.map((subject) => {
                  const resolvedCurriculum = isCBSE ? 'CBSE' : curriculum;
                  return (
                    <SubjectCard
                      key={subject.subject}
                      data={subject}
                      completedSet={completedSet}
                      width={cardWidth}
                      isBlocked={blockedSubjects.has(subject.subject)}
                      onPress={() => {
                        // Always route through the textbook-first Syllabus screen: it
                        // fetches the DB-published syllabus first (the real pipeline
                        // output), falls back to the curated hardcode, and — when a
                        // subject genuinely has neither — auto-forwards to the flat
                        // topic list. Deciding here off the frontend hardcode alone
                        // hid DB-published syllabi (e.g. Grade 1) behind raw book codes.
                        navigation.navigate('SubjectSyllabus', {
                          subject: subject.subject,
                          curriculum: resolvedCurriculum,
                          grade,
                        });
                      }}
                    />
                  );
                })}
              </View>
            )}

            {!loading && subjects.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={18} color={colors.textDim} />
                <Text style={styles.dimText}>No subjects available for this profile yet.</Text>
              </View>
            ) : null}
          </>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
