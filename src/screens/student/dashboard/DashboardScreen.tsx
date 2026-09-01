import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useAuth } from '../../../context/AuthContext';
import { useStudentData, formatStudyTime, formatLevel, xpForNextLevel } from '../../../context/StudentDataContext';
import { useTheme } from '../../../context/ThemeContext';
import { useNotification } from '../../../context/NotificationContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { getSubjectSyllabus } from '../../../data/syllabusRegistry';
import {
  computeRealTopicPerf, computeAvgScore, computeConsistency, computeWeeklyConsistency, computeBestTopic,
  computeAllBarTopics, computeMasteredTopics, computeLessonSubjects,
} from '../utils/performanceStats';
import { useDashboardData } from './hooks/useDashboardData';
import type { CurriculumTopic, CurriculumData } from './types';
import { BRAND, PASTEL, SUBJECT_COLORS, SUBJECT_ICONS } from './constants';
import { getGreeting, normalizeSearchText } from './utils/dashboardHelpers';
import { RingChart } from './components/common/icons';
import { SectionHeader } from './components/common/SectionHeader';
import { HeroCard } from './components/HeroCard';
import { GoalsCard } from './components/GoalsCard';
import { PerformanceCard } from './components/PerformanceCard';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { ContinueLearningCard } from './components/ContinueLearningCard';
import { AICoachBanner } from './components/AICoachBanner';
import { LearningPathCard } from './components/LearningPathCard';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation, route }: any) {
  const { user, refreshProfile } = useAuth();
  // Re-pull profile on focus so a parent's grade/curriculum edit reflects here without re-login.
  useFocusEffect(useCallback(() => { refreshProfile(); }, []));
  const { stats: ctxStats, studentId } = useStudentData();
  const { colors, isDark } = useTheme();
  const { unreadAssignments, unreadCount } = useNotification();
  const { isMobile, isTablet } = useResponsive();
  const styles = useMemo(() => makeStyles(colors, isMobile, isDark), [colors, isMobile, isDark]);

  // ── Parent-view-as-child override ────────────────────────
  const childOverride = route?.params?.childData as {
    name: string; grade: string; curriculum: string;
    xpPoints: number; level: number; currentStreak: number;
    studyTimeMinutes: number; todayStudyMinutes: number; topicsExplored: number;
    completedTopics: string[]; totalTopics: number;
  } | undefined;

  const stats = childOverride ? {
    ...ctxStats,
    xpPoints: childOverride.xpPoints ?? 0,
    level: childOverride.level ?? 1,
    currentStreak: childOverride.currentStreak ?? 0,
    studyTimeMinutes: childOverride.studyTimeMinutes ?? 0,
    topicsExplored: childOverride.topicsExplored ?? 0,
    completedTopics: childOverride.completedTopics ?? [],
    // Was hardcoded to 0 regardless of the child's real value — this is why
    // "Study Time" on the parent's view of a child's dashboard always showed
    // 0m/0% even when the child had genuinely studied today.
    todayStudyMinutes: childOverride.todayStudyMinutes ?? 0,
  } : ctxStats;

  // ── Derived identity/curriculum params — plain values, no fetching here.
  // Passed into useDashboardData below, which owns all caching/fetching.
  const childCurriculum = childOverride?.curriculum ?? user?.curriculum;
  const studentGrade = childOverride?.grade ?? user?.grade ?? 'Grade 3';
  // Was `.includes('ib')`, which also matched IB DP and IB MYP — routing
  // those students' dashboards through the IB PYP fetch path (wrong grade
  // range, wrong data), which failed and fell back to static Class 3 mock
  // content. Only match IB PYP itself; every other curriculum (including
  // IB DP/MYP) falls through to the real-curriculum path below instead.
  //
  // Bug: an unset curriculum used to unconditionally default to IB PYP,
  // which only has content for Grade 1-5 — any Grade 6-12 student without
  // curriculum explicitly set on their profile got real, non-empty fetch
  // requests that always came back empty. Only truly IB PYP-range grades
  // default to IB PYP when curriculum is missing; everyone else falls
  // through to CBSE/NCERT.
  const IB_PYP_GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  const isIBPYP = childCurriculum
    ? /^ib.?pyp$/i.test(childCurriculum.trim())
    : IB_PYP_GRADES.includes(studentGrade);

  const [searchQuery, setSearchQuery] = useState('');
  // '' = not chosen yet — effectiveBarSubjectFilter below picks the first
  // real subject as the default instead of a generic "All".
  const [barSubjectFilter, setBarSubjectFilter] = useState<string>('');
  // '' = not chosen yet — effectiveLessonSubjectFilter below picks the most
  // recently studied subject as the real default instead of a generic "All".
  const [lessonSubjectFilter, setLessonSubjectFilter] = useState<string>('');

  const {
    curriculum,
    loading,
    error,
    setError,
    upcomingDeadlines,
    perfData,
    subjectChapters,
    noContentGrade,
  } = useDashboardData({
    childOverride,
    childCurriculum,
    isIBPYP,
    studentGrade,
    studentId,
    userEmail: user?.email,
    navigation,
  });

  const heroAnim  = useMemo(() => new Animated.Value(0), []);
  const bodyAnim  = useMemo(() => new Animated.Value(0), []);
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  const firstName = (childOverride?.name ?? user?.name)?.split(' ')[0] || 'there';
  const curriculumName = childOverride?.curriculum ?? user?.curriculum ?? 'IB PYP';

  // card surfaces — wired to pastel theme tokens
  const cardBg     = colors.cardDark;
  const cardBorder  = colors.borderColor;
  const subtleBg   = colors.cardHover;
  const ringTrack  = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(139,92,246,0.08)';
  // "Today's Goals" cards always use a light pastel gradient (even in dark theme),
  // so their text/track use fixed light-card values regardless of the app theme.
  const goalText      = '#16241B';
  const goalMutedText = '#5C6F62';
  const goalDimText   = '#9FB0A4';
  const goalRingTrack = 'rgba(0,0,0,0.07)';
  const contentMax = isMobile ? undefined : isTablet ? 920 : 1080;

  // ── Derived ──────────────────────────────────────────────
  const completedSet  = useMemo(() => new Set(stats.completedTopics ?? []), [stats.completedTopics]);
  const allLessons    = useMemo(() => {
    if (!curriculum) return [];
    return curriculum.topics.map(t => {
      const perf = perfData.topics[t.topic];
      // Progress = actual quiz score always; completedSet only used for "Mastered" label (≥80%)
      let progress = 0;
      if (perf?.avgScore != null) progress = perf.avgScore;
      else if (completedSet.has(t.topic)) progress = 100; // legacy: completed with no quiz record
      else if (perf?.sessions && perf.sessions > 0) progress = 30;
      return {
        grade: t.grade, subject: t.subject, topic: t.topic, unit: t.unit,
        color: SUBJECT_COLORS[t.subject] ?? BRAND.violet,
        icon: SUBJECT_ICONS[t.subject] ?? 'book-open' as const,
        progress,
        quizScore: perf?.avgScore ?? null,
        quizCount: perf?.quizCount ?? 0,
      };
    });
  }, [curriculum, completedSet, perfData]);

  // Real, chapter-mapped topic names this student's grade/curriculum actually has a
  // working lesson page for (see syllabusRegistry.ts). "Continue Learning" must only
  // ever pick from THESE — picking from the full raw ~2403 ingested topics (most of
  // which are AI-extracted sub-concepts, not real textbook lessons) was routing
  // students into the broken generic VideoLesson "Coming Soon" placeholder instead
  // of the real Learn/Practice/Master experience.
  const curatedTopicNames = useMemo(() => {
    const curriculumLabel = isIBPYP ? 'IB PYP' : 'CBSE';
    const set = new Set<string>();
    subjectChapters.forEach(({ subject }) => {
      getSubjectSyllabus(curriculumLabel, studentGrade, subject).forEach(ch => {
        ch.topics.forEach(t => set.add(t.name));
      });
    });
    return set;
  }, [subjectChapters, isIBPYP, studentGrade]);

  const featuredLesson = useMemo(() => {
    // Restrict to topics with a real curated lesson, when any exist for this grade.
    const candidates = curatedTopicNames.size > 0
      ? allLessons.filter(l => curatedTopicNames.has(l.topic))
      : allLessons;
    // Pick the most recently attempted topic (by lastActivity from perfData)
    const withActivity = candidates
      .filter(l => perfData.topics[l.topic]?.lastActivity)
      .sort((a, b) => {
        const ta = perfData.topics[a.topic]?.lastActivity ?? '';
        const tb = perfData.topics[b.topic]?.lastActivity ?? '';
        return tb.localeCompare(ta); // most recent first
      });
    return withActivity[0] ?? candidates.find(l => l.progress > 0) ?? candidates[0] ?? allLessons[0];
  }, [allLessons, perfData, curatedTopicNames]);

  // The REAL chapter that featuredLesson.topic actually belongs to — not just
  // chapters[0]. Previously the headline always showed the first chapter
  // ("Fables and Folk Tales") regardless of which lesson was actually next,
  // so it visibly disagreed with the "Next lesson" line and never advanced
  // as the student progressed through later units.
  const featuredChapter = useMemo(() => {
    if (!featuredLesson) return null;
    const curriculumLabel = isIBPYP ? 'IB PYP' : 'CBSE';
    const chapters = getSubjectSyllabus(curriculumLabel, studentGrade, featuredLesson.subject);
    return chapters.find(ch => ch.topics.some(t => t.name === featuredLesson.topic)) ?? null;
  }, [featuredLesson, isIBPYP, studentGrade]);

  // Tapping "Continue Learning" should open the ACTUAL lesson, not just the
  // subject's syllabus screen. Where a curated chapter-accurate syllabus exists
  // for this subject/grade (see syllabusRegistry.ts — currently only Grade 6),
  // route straight into LessonScreen at the right chapter+topic. Otherwise,
  // route into LessonScreen's DB-by-name mode instead (Bug #8,
  // BUGS_AND_FIXES.md) — resolves real NCERT/Qdrant-only content (e.g.
  // "Ability Beyond Disability", Grade 9 English) directly by name, so it
  // reaches the current Learn/AI Tutor/Ask Aivorah/Practice flow instead of
  // the deprecated VideoLesson screen. If nothing real exists for this topic
  // either, LessonScreen's own contentReady state shows an honest "Coming
  // Soon" pane rather than a broken lesson — never worse than the old
  // fallback, and correct far more often.
  function openFeaturedLesson() {
    if (!featuredLesson) return;
    const curriculumLabel = isIBPYP ? 'IB PYP' : 'CBSE';
    const chapters = getSubjectSyllabus(curriculumLabel, studentGrade, featuredLesson.subject);
    for (let ci = 0; ci < chapters.length; ci++) {
      const ti = chapters[ci].topics.findIndex(t => t.name === featuredLesson.topic);
      if (ti !== -1) {
        navigation.navigate('LessonScreen', {
          subject: featuredLesson.subject, curriculum: curriculumLabel, grade: studentGrade,
          chapterTitle: chapters[ci].title, chapterIndex: ci, topicIndex: ti,
        });
        return;
      }
    }
    navigation.navigate('LessonScreen', {
      subject: featuredLesson.subject, curriculum: isIBPYP ? 'IB_PYP' : 'NCERT', grade: studentGrade,
      byNameTopic: featuredLesson.topic, topicName: featuredLesson.topic,
    });
  }

  const query = normalizeSearchText(searchQuery);
  const queryTerms = query ? query.split(' ') : [];

  // No "All" chip — with a subject like Mathematics carrying ~1900 topics, "All"
  // just dumps everything together. Instead, the subject the student most
  // recently studied (same signal as "Continue Learning") leads the list, so
  // whatever they were last working on is the default view, not a random pick.
  //
  // Source is subjectChapters (the same canonical, book-derived subject list
  // Performance's barSubjects and the actual chapter rows below use) — NOT
  // allLessons (raw Qdrant-ingested topics). Those two disagreed: allLessons
  // carries every raw ingestion subject tag, including near-duplicates from
  // inconsistent ingestion ("Physical Education" vs "Physical Education and
  // Well Being" for the same real subject) and subjects with zero real
  // chapters. That produced Learning Path chips (e.g. "Social Science", the
  // bare "Physical Education") that filteredChapterRows below — which is
  // built from subjectChapters — could never actually match, so tapping them
  // silently showed nothing. See Bug #7/#12, BUGS_AND_FIXES.md.
  const lessonSubjects = useMemo(
    () => computeLessonSubjects(subjectChapters, featuredLesson?.subject),
    [subjectChapters, featuredLesson]
  );

  const effectiveLessonSubjectFilter = lessonSubjects.includes(lessonSubjectFilter)
    ? lessonSubjectFilter
    : (lessonSubjects[0] ?? 'All');

  const filteredLessons = useMemo(() => {
    let list = allLessons;
    if (queryTerms.length > 0) {
      list = list.filter(l => {
        const haystack = normalizeSearchText(`${l.topic} ${l.subject} ${l.grade} ${l.unit}`);
        return queryTerms.every(term => haystack.includes(term));
      });
    }
    list = list.filter(l => l.subject === effectiveLessonSubjectFilter);
    return list;
  }, [allLessons, queryTerms, effectiveLessonSubjectFilter]);

  // Learning Path preview — one row per REAL chapter (from subjectChapters),
  // not per topic. A subject can have 1000+ ingested topics (Maths alone has
  // ~1900 for CBSE Grade 6); listing them all here doesn't scale, so this
  // mirrors the same chapter-level approach already used for the Performance
  // bars above.
  const allChapterRows = useMemo(() => {
    return subjectChapters.flatMap(({ subject, chapters }) =>
      chapters.map((title, i) => ({
        title, subject,
        color: SUBJECT_COLORS[subject] ?? BRAND.violet,
        icon: SUBJECT_ICONS[subject] ?? 'book-open' as const,
        chapterNo: i + 1,
      }))
    );
  }, [subjectChapters]);

  const filteredChapterRows = useMemo(() => {
    let list = allChapterRows;
    if (queryTerms.length > 0) {
      list = list.filter(c => {
        const haystack = normalizeSearchText(`${c.title} ${c.subject}`);
        return queryTerms.every(term => haystack.includes(term));
      });
    }
    list = list.filter(c => c.subject === effectiveLessonSubjectFilter);
    return list;
  }, [allChapterRows, queryTerms, effectiveLessonSubjectFilter]);

  const filteredDeadlines = queryTerms.length > 0
    ? upcomingDeadlines.filter((u) => {
        const haystack = normalizeSearchText(`${u.title} ${u.note || ''} ${u.date}`);
        return queryTerms.every(term => haystack.includes(term));
      })
    : upcomingDeadlines.slice(0, 4);

  // Performance bar data — one bar per REAL textbook chapter/unit (from the
  // authoritative manifests in subjectChapters), across every subject for this
  // grade. Raw ingested Qdrant topics aren't tagged with which chapter they
  // belong to, BUT where a curated syllabus exists for this subject/grade (see
  // syllabusRegistry.ts — currently CBSE Grade 6 English/Science/Social
  // Science), we DO have a real topic→chapter mapping, so those chapters get
  // real attributed scores from perfData instead of a flat 0%. Chapters with
  // no curated mapping yet (e.g. Mathematics) still show 0%/no-data — honest,
  // not fabricated — until that subject gets the same curated treatment.
  const allBarTopics = useMemo(
    () => computeAllBarTopics(subjectChapters, isIBPYP, studentGrade, perfData, completedSet),
    [subjectChapters, isIBPYP, studentGrade, perfData, completedSet]
  );

  // No "All" chip — same reasoning as lessonSubjects above: a flat "All" view
  // across every subject's chapters isn't useful, so only real subjects are listed.
  const barSubjects = useMemo(() => Array.from(new Set(allBarTopics.map(t => t.subject))).sort(), [allBarTopics]);

  const effectiveBarSubjectFilter = barSubjects.includes(barSubjectFilter) ? barSubjectFilter : (barSubjects[0] ?? '');

  const barTopics = useMemo(() =>
    allBarTopics.filter(t => t.subject === effectiveBarSubjectFilter),
  [allBarTopics, effectiveBarSubjectFilter]);

  // Real per-topic quiz results (independent of chapter grouping) — drives every
  // metric below the bars (average score, consistency, best score, insight text).
  // These stay accurate even though the bars themselves can't yet be attributed
  // to a specific chapter (see note on allBarTopics above).
  const realTopicPerf = useMemo(
    () => computeRealTopicPerf(curriculum?.topics, perfData),
    [curriculum, perfData]
  );

  const avgScore = useMemo(
    () => computeAvgScore(realTopicPerf, perfData.avgScore),
    [realTopicPerf, perfData.avgScore]
  );

  // Mastered chapters — estimated per subject as (completed topics / total topics in that
  // subject) × that subject's real chapter count, since individual topics aren't tagged
  // with which chapter they belong to yet (see note on allBarTopics). This is a genuine
  // progress-based estimate, not tied to any specific named chapter.
  const masteredTopics = useMemo(
    () => computeMasteredTopics(subjectChapters, curriculum, completedSet),
    [subjectChapters, curriculum, completedSet]
  );

  // % of attempted quizzes scoring ≥60% — always a real, live number (0% is a
  // genuine value here, not a placeholder) so it visibly moves as the student
  // takes more quizzes, same as every other stat on this card.
  const consistency = useMemo(() => computeConsistency(realTopicPerf), [realTopicPerf]);

  // Real weekly activity — days active this week, same signal as the hero's
  // "X of 7 days active" bar. Previously this pill just re-displayed the quiz-score
  // `consistency` value above (so both pills always matched, both always 0% with
  // only one quiz attempted) instead of being its own real weekly metric.
  const weeklyConsistency = computeWeeklyConsistency(stats.currentStreak);

  // Best topic — only topics with real quiz data
  const bestTopic = useMemo(() => computeBestTopic(realTopicPerf), [realTopicPerf]);

  // Real chapter that the best-scoring topic belongs to (not the raw topic name) —
  // same curated-syllabus lookup used for featuredChapter, so this stays consistent
  // with how the rest of the dashboard names units/chapters instead of topics.
  const bestChapter = useMemo(() => {
    if (!bestTopic) return null;
    const curriculumLabel = isIBPYP ? 'IB PYP' : 'CBSE';
    const chapters = getSubjectSyllabus(curriculumLabel, studentGrade, bestTopic.subject);
    return chapters.find(ch => ch.topics.some(t => t.name === bestTopic.label))?.title ?? null;
  }, [bestTopic, isIBPYP, studentGrade]);

  // Dynamic insight message below bars
  const perfInsight = useMemo(() => {
    if (!realTopicPerf.length) return 'Start a quiz on any chapter to see your scores here.';
    const weak = [...realTopicPerf].sort((a, b) => a.pct - b.pct)[0];
    const strong = [...realTopicPerf].sort((a, b) => b.pct - a.pct)[0];
    if (avgScore >= 80) return `Outstanding! You're mastering ${strong.fullLabel ?? strong.label}. Keep it up!`;
    if (avgScore >= 60) return `Good progress! Focus a bit more on ${weak.fullLabel ?? weak.label} to level up.`;
    return `Keep practising! ${weak.fullLabel ?? weak.label} needs more attention — you can do it!`;
  }, [realTopicPerf, avgScore]);

  // Goals — Study Time is daily; Chapters and XP are lifetime totals
  const studyGoal  = 60;  const studyDone  = Math.min(stats.todayStudyMinutes, studyGoal);
  // Chapters goal = total units/chapters in student's curriculum for their grade (not raw topic count)
  const topicsGoal = Math.max(allBarTopics.length, 1);
  // "Mastered" chapters — same count used in the hero ("X of Y chapters mastered")
  const topicsMastered = masteredTopics;
  const topicsDone = Math.min(topicsMastered, topicsGoal);
  // Badge thresholds: 25%, 50%, 100% of curriculum — purely percentage-based
  const t25 = Math.floor(topicsGoal * 0.25);
  const t50 = Math.floor(topicsGoal * 0.50);
  // Max XP per grade — accounts for quizzes + challenges + assignments
  const XP_MAX_BY_GRADE: Record<string, number> = {
    'Grade 3': 4000, 'Class 3': 4000,
    'Grade 4': 4500, 'Class 4': 4500,
    'Grade 5': 5000, 'Class 5': 5000,
    'Grade 6': 6000, 'Class 6': 6000,
  };
  const xpGoal = XP_MAX_BY_GRADE[studentGrade] ?? 4000;
  const xpDone = Math.min(stats.xpPoints, xpGoal);
  const xp25   = Math.floor(xpGoal * 0.25);
  const xp50   = Math.floor(xpGoal * 0.50);
  // Max level reachable for this grade — the level the XP cap falls into
  const maxLevel = xpForNextLevel(xpGoal).level;
  // Real progress toward the NEXT level — {current, needed} XP within the current level.
  // Drives the "Level N → N+1" bar so it actually reflects XP, not the weekly streak.
  const levelProgress = xpForNextLevel(stats.xpPoints);

  const GOALS = [
    { label: 'Study Time', val: formatStudyTime(studyDone), target: '1h',
      sub: 'today', raw: studyDone, goal: studyGoal,
      pct: studyGoal > 0 ? studyDone / studyGoal : 0,
      color: BRAND.teal, pastel: PASTEL.teal, icon: 'clock' as const,
      badges: [
        // Unlock when today's study time crosses the threshold — all badges share the card's teal theme
        { icon: 'zap'   as const, label: 'Early Bird', color: BRAND.teal, bg: PASTEL.teal, unlocked: stats.todayStudyMinutes >= 15, tip: '15 min today' },
        { icon: 'sun'   as const, label: 'Half Hour',  color: BRAND.teal, bg: PASTEL.teal, unlocked: stats.todayStudyMinutes >= 30, tip: '30 min today' },
        { icon: 'award' as const, label: 'Study Hero', color: BRAND.teal, bg: PASTEL.teal, unlocked: stats.todayStudyMinutes >= 60, tip: '60 min today' },
      ]},
    { label: 'Chapters', val: `${topicsDone} / ${topicsGoal}`, target: `${topicsGoal} chapters`,
      route: 'LearningPaths' as const,
      sub: 'total', caption: 'chapters mastered', raw: topicsDone, goal: topicsGoal,
      pct: topicsDone / topicsGoal,
      color: BRAND.rose, pastel: PASTEL.pink, icon: 'book-open' as const,
      badges: [
        // 25% → Explorer, 50% → Deep Diver, 100% → Scholar — all badges share the card's rose theme
        { icon: 'compass' as const, label: 'Explorer',   color: BRAND.rose, bg: PASTEL.pink, unlocked: topicsMastered >= t25,       tip: `Master ${t25} chapters`       },
        { icon: 'layers'  as const, label: 'Deep Diver', color: BRAND.rose, bg: PASTEL.pink, unlocked: topicsMastered >= t50,       tip: `Master ${t50} chapters`       },
        { icon: 'book'    as const, label: 'Scholar',    color: BRAND.rose, bg: PASTEL.pink, unlocked: topicsMastered >= topicsGoal, tip: `Master all ${topicsGoal} chapters` },
      ]},
    { label: 'XP Earned', val: stats.xpPoints.toLocaleString(), target: `${xpGoal.toLocaleString()} XP`,
      sub: 'total', caption: 'XP earned', raw: xpDone, goal: xpGoal,
      pct: xpDone / xpGoal,
      color: BRAND.gold, pastel: PASTEL.yellow, icon: 'star' as const,
      badges: [
        // 25% / 50% / 100% of grade max XP — all badges share the card's gold theme
        { icon: 'star'        as const, label: 'XP Spark',  color: BRAND.gold, bg: PASTEL.yellow, unlocked: stats.xpPoints >= xp25,   tip: `Earn ${xp25.toLocaleString()} XP`    },
        { icon: 'trending-up' as const, label: 'Leveling',  color: BRAND.gold, bg: PASTEL.yellow, unlocked: stats.xpPoints >= xp50,   tip: `Earn ${xp50.toLocaleString()} XP`    },
        { icon: 'shield'      as const, label: 'XP Master', color: BRAND.gold, bg: PASTEL.yellow, unlocked: stats.xpPoints >= xpGoal,  tip: `Earn all ${xpGoal.toLocaleString()} XP` },
      ]},
  ];

  const STAT_TILES = [
    { icon: 'clock'       as const, val: formatStudyTime(stats.studyTimeMinutes), label: 'Study Time',  color: BRAND.teal,   pastel: PASTEL.teal,   sub: 'this week',     pct: Math.min(stats.studyTimeMinutes / (7 * 60), 1) },
    { icon: 'zap'         as const, val: String(stats.currentStreak),             label: 'Day Streak',  color: BRAND.rose,   pastel: PASTEL.pink,   sub: 'days in a row', pct: Math.min(stats.currentStreak / 14, 1) },
    { icon: 'star'        as const, val: stats.xpPoints.toLocaleString(),         label: 'Total XP',    color: BRAND.gold,   pastel: PASTEL.yellow, sub: 'points earned', pct: Math.min(stats.xpPoints / 5000, 1) },
    { icon: 'book-open'   as const, val: String(topicsMastered),                  label: 'Chapters Done', color: BRAND.forest, pastel: PASTEL.green,  sub: 'mastered',      pct: Math.min(topicsMastered / topicsGoal, 1) },
  ];


  // Animations
  useEffect(() => {
    if (loading || !curriculum) return;
    heroAnim.setValue(0); bodyAnim.setValue(0);
    Animated.parallel([
      Animated.timing(heroAnim, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bodyAnim, { toValue: 1, duration: 720, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [loading, error, curriculum]);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <ScreenLayout>
      <View style={styles.screen}>
        {/* Ambient bg blobs */}
        <View style={styles.blobTL} pointerEvents="none" />
        <View style={styles.blobBR} pointerEvents="none" />

     <Header
  title={childOverride ? `${firstName}'s Dashboard` : `${getGreeting()}, ${firstName}`}
  subtitle={`${curriculumName} · ${studentGrade}`}
  showSearch={false}
  // On mobile the hamburger menu already doubled as "back" here, but on web/
  // desktop onMenuPress is never wired to a visible button at all (it only
  // renders on isMobile) — so a parent viewing a child's dashboard had no
  // visible way back to My Kids. showBack renders a proper back arrow on
  // every platform, and onBack sends them straight to My Kids explicitly
  // rather than relying on navigation history.
  showBack={!!childOverride}
  onBack={childOverride ? () => navigation.navigate('ParentMyKids') : undefined}
  onMenuPress={childOverride ? () => navigation.goBack() : () => navigation.openDrawer()}
  notificationCount={childOverride ? 0 : unreadCount}
/>

        {/* ── Main content ─────────────────────────────────────
            Always rendered immediately — `curriculum` is never null (it starts
            as either the prefetched cache or a static fallback, see useState
            above), so there is no reason to block the whole screen behind a
            spinner while the real fetch is still in flight. Real numbers swap
            in silently via setCurriculum once the network call resolves.
            Previously this blocked on `loading`, which showed a full-screen
            "Loading your dashboard" spinner on every login because the
            curriculum prefetch (fired in AuthContext right after setUser)
            rarely wins the race against React Navigation mounting this
            screen a moment later — defeating the whole point of prefetching. */}
        {error !== '' && (
          <View style={[styles.stateCenter, { paddingVertical: 12 }]}>
            <Text style={[styles.stateSub, { color: BRAND.red }]}>{error} — showing your last known curriculum.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setError('')} activeOpacity={0.82}>
              <Feather name="refresh-cw" size={13} color="#fff" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {curriculum && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
            <View style={[styles.pageWrap, contentMax ? { maxWidth: contentMax } : undefined]}>

              <HeroCard
                styles={styles}
                heroAnim={heroAnim}
                stats={stats}
                firstName={firstName}
                noContentGrade={noContentGrade}
                studentGrade={studentGrade}
                topicsGoal={topicsGoal}
                topicsMastered={topicsMastered}
                t25={t25}
                t50={t50}
                maxLevel={maxLevel}
                levelProgress={levelProgress}
                xpGoal={xpGoal}
                navigation={navigation}
              />

              {/* ══ BODY ══════════════════════════════════════ */}
              <Animated.View style={[styles.body, {
                opacity: bodyAnim,
                transform: [{ translateY: bodyAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
              }]}>

                <GoalsCard
                  styles={styles}
                  isMobile={isMobile}
                  isDark={isDark}
                  goals={GOALS}
                  cardBorder={cardBorder}
                  goalText={goalText}
                  goalMutedText={goalMutedText}
                  goalDimText={goalDimText}
                  goalRingTrack={goalRingTrack}
                  navigation={navigation}
                />

                <PerformanceCard
                  styles={styles}
                  colors={colors}
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  avgScore={avgScore}
                  masteredTopics={masteredTopics}
                  topicsGoal={topicsGoal}
                  consistency={consistency}
                  bestTopic={bestTopic}
                  bestChapter={bestChapter}
                  weeklyConsistency={weeklyConsistency}
                  barSubjects={barSubjects}
                  barSubjectFilter={effectiveBarSubjectFilter}
                  setBarSubjectFilter={setBarSubjectFilter}
                  barTopics={barTopics}
                  perfInsight={perfInsight}
                />

                {/* ── QUICK ACTIONS ── hidden in parent child-view mode ── */}
                {!childOverride && (
                  <QuickActionsGrid styles={styles} colors={colors} isDark={isDark} cardBg={cardBg} navigation={navigation} />
                )}

                {/* ── CONTINUE LEARNING ───────────────────────── */}
                {featuredLesson && (
                  <ContinueLearningCard
                    styles={styles}
                    colors={colors}
                    cardBg={cardBg}
                    featuredLesson={featuredLesson}
                    featuredChapter={featuredChapter}
                    ringTrack={ringTrack}
                    openFeaturedLesson={openFeaturedLesson}
                  />
                )}

                {/* ── AI COACH BANNER ─────────────────────────── */}
                <AICoachBanner styles={styles} pulseAnim={pulseAnim} navigation={navigation} />

                {/* ── PROGRESS SNAPSHOT ───────────────────────── */}
                {/* ── LEARNING PATH ───────────────────────────── */}
                <LearningPathCard
                  styles={styles}
                  colors={colors}
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  subtleBg={subtleBg}
                  noContentGrade={noContentGrade}
                  studentGrade={studentGrade}
                  topicsGoal={topicsGoal}
                  isIBPYP={isIBPYP}
                  lessonSubjects={lessonSubjects}
                  effectiveLessonSubjectFilter={effectiveLessonSubjectFilter}
                  setLessonSubjectFilter={setLessonSubjectFilter}
                  filteredChapterRows={filteredChapterRows}
                  searchQuery={searchQuery}
                  navigation={navigation}
                />

                <View style={{ height: 36 }} />
              </Animated.View>
            </View>
          </ScrollView>
        )}

      </View>
      
    </ScreenLayout>
  );
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────

export const makeStyles = (c: AppColors, isMobile: boolean, isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  blobTL: { display: 'none' },
  blobBR: { display: 'none' },

  scroll:    { flex: 1 },
  scrollPad: { padding: isMobile ? 14 : 20, paddingBottom: 48 },
  pageWrap:  { width: '100%', alignSelf: 'center', gap: 16 },
  body:      { gap: 14 },

  // State screens
  stateCenter:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  stateIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.indigo + '18' },
  stateTitle:    { fontSize: 18, fontWeight: '700', color: c.textMain, fontFamily: fonts.serif },
  stateSub:      { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  retryBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND.violet, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, marginTop: 6 },
  retryText:     { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── Hero ──────────────────────────────────────────────
  heroCard: {
    borderRadius: 22, padding: 20, paddingBottom: 18, overflow: 'hidden', position: 'relative', minHeight: 165,
    borderWidth: 1, borderColor: 'rgba(245,243,238,0.16)',
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
  },
  heroGlowLeft:  { display: 'none' },
  heroGlowRight: { display: 'none' },

  heroBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 14, zIndex: 2 },
  levelBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(11,11,11,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(11,11,11,0.18)' },
  levelTxt:     { fontSize: 10, fontWeight: '800', color: '#0B0B0B', letterSpacing: 0.2 },
  streakBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(11,11,11,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(11,11,11,0.18)' },
  streakTxt:    { fontSize: 10, fontWeight: '700', color: '#0B0B0B' },

  heroGreeting: { fontSize: 12, fontWeight: '700', color: 'rgba(11,11,11,0.6)', zIndex: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroName:     { fontFamily: fonts.serif, fontSize: isMobile ? 30 : 38, fontWeight: '500', color: '#0B0B0B', letterSpacing: -0.5, lineHeight: isMobile ? 34 : 44, marginBottom: 4, zIndex: 1 },
  heroSub:      { fontSize: 12, color: 'rgba(11,11,11,0.78)', fontWeight: '500', lineHeight: 18, marginBottom: 14, zIndex: 1, maxWidth: '90%' },

  xpBlock:    { zIndex: 1, marginBottom: 14 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLbl:      { fontSize: 10, fontWeight: '800', color: 'rgba(11,11,11,0.7)' },
  xpNum:      { fontSize: 10, fontWeight: '800', color: 'rgba(11,11,11,0.7)' },
  xpTrack:    { height: 8, backgroundColor: 'rgba(11,11,11,0.18)', borderRadius: 4, overflow: 'hidden' },
  xpFill:     { height: '100%', backgroundColor: '#0B0B0B', borderRadius: 4 },
  xpTotal:    { fontSize: 10, fontWeight: '700', color: 'rgba(11,11,11,0.62)', marginTop: 6 },

  heroCta:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0B0B0B', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start', zIndex: 1 },
  heroCtaPlay:  { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroCtaTxt:   { fontSize: 13, fontWeight: '800', color: '#fff', flex: 1 },

  heroChipOutside: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  heroChipDot: { width: 6, height: 6, borderRadius: 3 },
  heroChipValOutside: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  heroChipLblOutside: { fontSize: 10, fontWeight: '600', marginTop: -1 },

  // ── Goals ─────────────────────────────────────────────
  goalsRow:       { flexDirection: 'row', gap: 12 },
  goalsRowMobile: { flexWrap: 'wrap' },
  goalsRowScroll: { flexDirection: 'row', gap: 10, paddingHorizontal: 2, paddingBottom: 4 },
  goalCard: {
    flex: 1,
    borderRadius: 22, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: isDark ? 0.25 : 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  goalCardMobile: {
    width: Math.round(SCREEN_WIDTH * 0.72),
    borderRadius: 22, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: isDark ? 0.25 : 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  goalCardGradient: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  goalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  goalTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  goalIconOrb: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  goalTitle: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  goalMeta: { fontSize: 9.5, marginTop: 1 },
  goalStatusPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  goalStatusTxt: { fontSize: 10, fontWeight: '800' },
  goalMidRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalBadgesRight: { flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'space-evenly', alignSelf: 'stretch' },
  goalBadgeMedalWrap: { alignItems: 'center', gap: 2 },
  goalBadgeMedal: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'visible',
  },
  goalBadgeGlow: {
    position: 'absolute', width: 34, height: 34, borderRadius: 17,
  },
  goalBadgeCheckDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 12, height: 12, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  goalBadgeMedalLabel: { fontSize: 7.5, textAlign: 'center', letterSpacing: 0.2 },
  goalRingWrap:   { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  goalRingCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  goalPct:        { fontSize: 15, fontWeight: '900', letterSpacing: -0.6 },
  goalRingSub:    { fontSize: 8, fontWeight: '700', marginTop: -1, textTransform: 'uppercase', letterSpacing: 0.5 },
  goalValueWrap:  { flex: 1, gap: 2, justifyContent: 'center' },
  goalVal:        { fontSize: 24, fontWeight: '900', letterSpacing: -1.1, lineHeight: 26 },
  goalTarget:     { fontSize: 10 },
  goalMiniMeta:   { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginTop: 2 },
  goalMiniMetaTxt:{ fontSize: 10, fontWeight: '700' },
  goalBar:        { width: '100%', height: 6, borderRadius: 999, overflow: 'hidden' },
  goalBarFill:    { height: '100%', borderRadius: 999 },

  // ── Performance card ──────────────────────────────────
  perfCard: {
    borderRadius: 24, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOpacity: isDark ? 0.2 : 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 },
  },
  perfCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  perfHeaderGradient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12 },
  perfCardTitle:   { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, fontFamily: fonts.serif },
  perfCardSub:     { fontSize: 11, marginTop: 2 },
  perfViewAll:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  perfViewAllTxt:  { fontSize: 11, fontWeight: '700' },
  perfInsightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  perfInsightPill: { minWidth: 110, flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 9 },
  perfInsightPillWide: { minWidth: 130 },
  perfInsightValue: { fontSize: 17, fontWeight: '900', letterSpacing: -0.6 },
  perfInsightLabel: { fontSize: 10, marginTop: 2 },

  bestScoreRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
  bestScoreIcon:   { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bestScoreLabel:  { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  bestScoreVal:    { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  bestScoreTopic:  { fontSize: 12, fontWeight: '400' },
  bestScoreSplit:  { width: 1, height: 34, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(2,6,23,0.1)' },
  bestScoreMeta:   { marginRight: 4 },
  bestScoreMetaVal:{ fontSize: 15, fontWeight: '900', letterSpacing: -0.4 },
  bestScoreMetaLbl:{ fontSize: 9, marginTop: 1 },
  bestScoreCompactRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  bestScorePill:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 200 },
  bestScoreCompactVal:  { fontSize: 13, fontWeight: '800' },
  bestScoreCompactTopic:{ fontSize: 11, fontWeight: '500', flexShrink: 1 },
  allLessonsBtn:   { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 'auto' },
  allLessonsTxt:   { fontSize: 11, fontWeight: '600' },
  perfInsightText: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  perfInsightMsg:  { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  barChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  barChipTxt:      { fontSize: 11, fontWeight: '700' },
  barSubject:      { fontSize: 9, fontWeight: '500', textAlign: 'center', marginTop: 2 },

  barScroll: { marginTop: 2 },
  barCol:    { alignItems: 'center', width: 52, gap: 6 },
  barTrack:  { width: 34, height: 116, borderRadius: 12, borderWidth: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(2,6,23,0.04)', overflow: 'hidden', justifyContent: 'flex-end', padding: 2 },
  barFill:   { width: '100%', borderRadius: 10 },
  barPct:    { fontSize: 11, fontWeight: '900' },
  barLabel:  { fontSize: 9, textAlign: 'center', lineHeight: 12, width: 52 },

  // ── Quick actions ─────────────────────────────────────
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: isMobile ? Math.floor((SCREEN_WIDTH - 28 - 28 - 10) / 2) : '32.1%',
    borderWidth: 1, borderRadius: 18, padding: 14, gap: 8,
    shadowColor: '#000', shadowOpacity: isDark ? 0.15 : 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
  },
  quickIconBox:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickArrowBox: { position: 'absolute', top: 14, right: 14 },
  quickLabel:    { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  quickDesc:     { fontSize: 11 },

  // ── Continue learning ─────────────────────────────────
  clCard: {
    borderRadius: 22, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: isDark ? 0.2 : 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 },
  },
  clStrip: { height: 5 },
  clBody:  { padding: 16, gap: 10 },
  clTopRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  clSubPill:  { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  clSubText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  clTopic:    { fontSize: isMobile ? 18 : 21, fontWeight: '900', letterSpacing: -0.5, lineHeight: isMobile ? 22 : 26, fontFamily: fonts.serif },
  clUnit:     { fontSize: 12, fontStyle: 'italic' },
  clRingWrap:   { position: 'relative', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  clRingCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  clRingPct:    { fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
  clRingDone:   { fontSize: 9, fontWeight: '600' },

  stageRow:  { flexDirection: 'row', alignItems: 'center' },
  stageNode: { alignItems: 'center', gap: 5 },
  stageDot:  { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stageLbl:  { fontSize: 10, fontWeight: '700' },
  stageLine: { flex: 1, height: 2, marginBottom: 18 },

  clBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  clHint:      { flex: 1, fontSize: 12, lineHeight: 17 },
  clCtaBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  clCtaTxt:    { fontSize: 13, fontWeight: '800', color: '#fff' },

  // ── AI banner ─────────────────────────────────────────
  aiBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, overflow: 'hidden', position: 'relative',
    shadowColor: '#BAA467', shadowOpacity: isDark ? 0.5 : 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
  },
  aiGlow:       { position: 'absolute', right: -50, top: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(11,11,11,0.04)' },
  aiAvatarWrap: { position: 'relative', flexShrink: 0 },
  aiAvatarOuter:{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(11,11,11,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(11,11,11,0.18)' },
  aiAvatarInner:{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(11,11,11,0.08)', alignItems: 'center', justifyContent: 'center' },
  aiOnline:     { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#2E7D52', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  aiBannerBody: { flex: 1, gap: 2 },
  aiTag:        { fontSize: 9, fontWeight: '800', color: 'rgba(11,11,11,0.55)', letterSpacing: 1 },
  aiTitle:      { fontSize: 17, fontWeight: '900', color: '#0B0B0B', letterSpacing: -0.3, fontFamily: fonts.serif },
  aiSub:        { fontSize: 12, color: 'rgba(11,11,11,0.72)', lineHeight: 17 },
  aiBannerCta:  { alignItems: 'center', gap: 4, flexShrink: 0 },
  aiBannerCtaTxt:{ fontSize: 11, fontWeight: '800', color: 'rgba(11,11,11,0.85)' },

  // ── Stats grid ────────────────────────────────────────
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: isMobile ? Math.floor((SCREEN_WIDTH - 28 - 28 - 10) / 2) : '23.8%', borderWidth: 1, borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOpacity: isDark ? 0.15 : 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
  },
  statIconBox: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statVal:     { fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  statLabel:   { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  statSub:     { fontSize: 10, textAlign: 'center' },
  statBar:     { width: '88%', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  statBarFill: { height: '100%', borderRadius: 3 },

  // ── Lesson list ───────────────────────────────────────
  emptyCard:   { borderWidth: 1, borderRadius: 16, padding: 30, alignItems: 'center', gap: 10 },
  emptyTxt:    { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  lessonContainer: { borderWidth: 1, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: isDark ? 0.15 : 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  lessonRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, position: 'relative' },
  lessonDot:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  lessonIconBox:{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lessonMid:   { flex: 1, gap: 3 },
  lessonTopic: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  lessonMeta:  { fontSize: 11 },
  lessonBar:   { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  lessonBarFill:{ height: '100%', borderRadius: 2 },
  lessonRight: { gap: 6, alignItems: 'flex-end', flexShrink: 0 },
  stagePill:   { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  stagePillTxt:{ fontSize: 10, fontWeight: '700' },
  lessonCta:   { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  lessonCtaTxt:{ fontSize: 11, fontWeight: '800' },

  // ── Deadlines ─────────────────────────────────────────
  deadlineCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: isDark ? 0.15 : 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  deadlineRow:  { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  deadlineTimeline: { alignItems: 'center', paddingTop: 3, width: 14 },
  deadlineDot:  { width: 10, height: 10, borderRadius: 5 },
  deadlineLine: { width: 2, flex: 1, marginTop: 5 },
  deadlineBody: { flex: 1, gap: 3 },
  deadlineTitle:{ fontSize: 14, fontWeight: '700' },
  deadlineNote: { fontSize: 12, lineHeight: 17 },
  dueBadge:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  dueTxt:       { fontSize: 11, fontWeight: '800' },

  // ── Notification modal ────────────────────────────────
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  notifPanel:      { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '78%', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: -10 } },
  notifHeaderGrad: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },
  notifTitle:      { fontSize: 18, fontWeight: '900', fontFamily: fonts.serif },
  notifSub:        { fontSize: 12, marginTop: 2 },
  notifHeaderRight:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  markAllBtn:      { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  markAllTxt:      { fontSize: 11, fontWeight: '700' },
  closeBtn:        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  notifItem:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  notifItemIcon:   { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  notifItemBody:   { flex: 1, gap: 2 },
  notifItemTitle:  { fontSize: 14, fontWeight: '700' },
  notifItemBody2:  { fontSize: 12, lineHeight: 17 },
  notifItemTime:   { fontSize: 11, marginTop: 2 },
  notifSep:        { height: 1, marginHorizontal: 20 },
  unreadDot:       { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
});
