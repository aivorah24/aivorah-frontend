import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, radius, fonts } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useParentProgress } from './hooks/useParentProgress';
import { makeStyles, AV } from './styles';

function formatStudyTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// SVG circular progress ring (web only, fallback for native)
function CircularProgress({ pct, size = 110, strokeWidth = 10, color = '#BAA467', textColor }: any) {
  const tc = textColor || color;
  if (Platform.OS === 'web') {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const filled = Math.max(0, Math.min(pct / 100, 1)) * circ;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* @ts-ignore */}
        <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A2215" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </svg>
        <Text style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: '900', color: tc }}>{pct}%</Text>
        <Text style={{ fontFamily: fonts.serif, fontSize: 9, color: '#888', fontWeight: '600', letterSpacing: 0.3 }}>Completed</Text>
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderRadius: size / 2, borderWidth: strokeWidth, borderColor: color }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: '900', color: tc }}>{pct}%</Text>
      <Text style={{ fontFamily: fonts.serif, fontSize: 9, color: '#888' }}>Completed</Text>
    </View>
  );
}

export default function ParentProgressScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const gold = colors.accentYellow;          // Aivorah brand gold — #BAA467
  const goldLight = colors.accentYellow + 'BB';
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const {
    children,
    selectedIdx,
    setSelectedIdx,
    stats,
    weekly,
    loading,
    refreshing,
    setRefreshing,
    practiceInsights,
    insightsGenerating,
    insightAnims,
    child,
    fetchData,
  } = useParentProgress(route);

  // Derived data
  const completedTopics: string[] = stats?.completedTopics ?? [];
  const totalTopics = stats?.totalTopics || completedTopics.length || 1;
  const progressPct = Math.min(100, Math.round((completedTopics.length / totalTopics) * 100));
  const actMax = 240; // full bar = 4 hours (240 min); goal line (2h) sits at the halfway mark
  const totalWeekMins = weekly.reduce((a, b) => a + b, 0);
  const topics: any[] = practiceInsights?.topics ?? [];
  const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // AI Insights derived from practice data
  const aiInsights: any[] = useMemo(() => {
    const list: any[] = [];
    topics.forEach(t => {
      if (t.latestScore >= 80 && t.passed) {
        list.push({ icon: 'check-circle', color: gold,  text: `Strong in ${t.topic}`, sub: 'Excellent performance! Keep it up.' });
      } else if (t.improving) {
        list.push({ icon: 'trending-up', color: goldLight, text: `Improving in ${t.topic}`, sub: "You're getting better. Keep practicing." });
      } else if (!t.passed && t.latestScore < 60) {
        list.push({ icon: 'alert-circle', color: gold, text: `Needs practice in ${t.topic}`, sub: 'Focus more on this topic to improve.' });
      }
    });
    if ((stats?.currentStreak ?? 0) >= 2) {
      list.push({ icon: 'activity', color: gold, text: 'Study consistency improving', sub: 'Great job maintaining your streak!' });
    }
    return list.slice(0, 4);
  }, [topics, stats, gold, goldLight]);

  // Subject progress — derived from completedTopics + practice insights
  const subjectProgress: any[] = useMemo(() => {
    // Use server-provided subjectProgress if available
    if (stats?.subjectProgress && Array.isArray(stats.subjectProgress)) {
      return stats.subjectProgress;
    }
    // Derive: keyword-based topic → subject mapping
    // Colors match LearningPathsScreen SUBJECT_META exactly
    const SUBJECT_MAP: Record<string, { label: string; icon: string; color: string; gradFrom: string; gradTo: string; keywords: string[] }> = {
      Mathematics:      { label: 'Mathematics',  icon: 'trending-up', color: '#BAA467', gradFrom: '#BAA467', gradTo: '#C9B078', keywords: ['addition','subtraction','multiplication','division','fraction','decimal','algebra','geometry','number','calculation','percentage','ratio','currency','barter','coins','money','weight','measurement','time','data','graph','symmetry','area','perimeter'] },
      Science:          { label: 'Science',       icon: 'zap',         color: '#BAA467', gradFrom: '#BAA467', gradTo: '#C9B078', keywords: ['plant','animal','adaptation','habitat','living','force','energy','matter','light','sound','water','air','body','health','food','nutrition','environment','soil','rock','weather','electricity','magnet'] },
      English:          { label: 'English',       icon: 'book-open',   color: '#BAA467', gradFrom: '#BAA467', gradTo: '#C9B078', keywords: ['reading','writing','grammar','poem','story','comprehension','vocabulary','verb','noun','adjective','adverb','sentence','paragraph','letter','punctuation','spelling','language','composition'] },
      'Social Studies': { label: 'Social Studies', icon: 'globe',      color: '#BAA467', gradFrom: '#BAA467', gradTo: '#C9B078', keywords: ['history','geography','community','culture','map','country','economics','trade','government','citizen','society','family','festival','tradition','heritage','resource','agriculture','industry','transport','communication','continent','climate'] },
    };
    const subjectCounts: Record<string, { total: number; completed: number }> = {};
    Object.keys(SUBJECT_MAP).forEach(s => { subjectCounts[s] = { total: 0, completed: 0 }; });

    // Count completed topics per subject
    completedTopics.forEach(topic => {
      const lower = topic.toLowerCase();
      for (const [subj, meta] of Object.entries(SUBJECT_MAP)) {
        if (meta.keywords.some(k => lower.includes(k))) {
          subjectCounts[subj].completed++;
          subjectCounts[subj].total++;
          return;
        }
      }
      // Default unmatched to Mathematics
      subjectCounts['Mathematics'].completed++;
      subjectCounts['Mathematics'].total++;
    });

    // Use totalTopics split equally if no matches
    const totalPerSubject = Math.max(1, Math.floor(totalTopics / 4));
    return Object.entries(SUBJECT_MAP).map(([key, meta]) => {
      const counts = subjectCounts[key];
      const effectiveTotal = Math.max(counts.total, totalPerSubject);
      const pct = Math.min(100, Math.round((counts.completed / effectiveTotal) * 100));
      return { label: meta.label, icon: meta.icon, color: meta.color, gradFrom: meta.gradFrom, gradTo: meta.gradTo, pct, completed: counts.completed, total: effectiveTotal };
    }).filter(s => s.completed > 0 || completedTopics.length === 0);
  }, [stats, completedTopics, totalTopics]);

  // Achievements derived from stats
  const achievements: any[] = useMemo(() => {
    const list: any[] = [];
    if (completedTopics.length >= 1) list.push({ icon: 'star', color: gold, label: 'First Steps', sub: `Completed ${completedTopics.length} topic${completedTopics.length !== 1 ? 's' : ''}` });
    if ((stats?.currentStreak ?? 0) >= 2) list.push({ icon: 'activity', color: gold,  label: 'Streak Starter', sub: `${stats.currentStreak} day streak` });
    if (completedTopics.length >= 5) list.push({ icon: 'zap',  color: goldLight, label: 'Quick Learner',  sub: `Completed ${completedTopics.length} topics` });
    const perfect = topics.find(t => t.latestScore === 100);
    if (perfect) list.push({ icon: 'award', color: gold,  label: 'Perfect Score',  sub: `100% in ${perfect.topic}` });
    return list;
  }, [completedTopics, stats, topics, gold, goldLight]);

  // Recommended next steps
  const nextSteps: any[] = useMemo(() => {
    const steps: any[] = [];
    const lastTopic = completedTopics[completedTopics.length - 1];
    if (lastTopic) steps.push({ icon: 'book-open', color: gold, label: 'Continue Learning', sub: lastTopic.replace(/_/g, ' ') });
    const weakTopic = [...topics].sort((a, b) => a.latestScore - b.latestScore).find(t => !t.passed);
    if (weakTopic) steps.push({ icon: 'target', color: gold, label: 'Practice Weak Areas', sub: weakTopic.topic });
    steps.push({ icon: 'clipboard', color: gold, label: 'Take Weekly Quiz', sub: 'Test your understanding' });
    return steps.slice(0, 3);
  }, [completedTopics, topics, gold]);

  const bgCard = isDark ? colors.cardDark : '#fff';
  const borderCol = isDark ? colors.borderColor : AV.sand;

  return (
    <ScreenLayout>
      <View style={[styles.screen, { backgroundColor: isDark ? colors.bgDark : AV.cream }]}>
        <Header title="Progress & Reports" subtitle="Detailed academic reports" searchPlaceholder="Search..." onMenuPress={() => navigation.openDrawer()} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor='#BAA467' />}
        >
          {/* Child tabs */}
          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              {children.map((c, i) => (
                <TouchableOpacity key={c.id} onPress={() => setSelectedIdx(i)} activeOpacity={0.8} style={{ marginRight: 8 }}>
                  {selectedIdx === i
                    ? <LinearGradient colors={['#BAA467', '#C9B078']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabActive}><Text style={styles.tabTextActive}>{c.name}</Text></LinearGradient>
                    : <View style={[styles.tab, { backgroundColor: bgCard, borderColor: borderCol }]}><Text style={[styles.tabText, { color: colors.textMuted }]}>{c.name}</Text></View>
                  }
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {loading ? (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <ActivityIndicator color='#BAA467' size="large" />
              <Text style={{ color: colors.textDim, fontFamily: fonts.serif, fontSize: 13 }}>Loading {child?.name}&apos;s progress...</Text>
            </View>
          ) : (
            <>
              {/* ── ROW 1: Hero ── */}
              <View style={[styles.card, { backgroundColor: bgCard, borderColor: borderCol, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 }]}>
                {/* Avatar + Name */}
                <LinearGradient colors={[gold, goldLight]} style={styles.avatarCircle}>
                  <Text style={styles.avatarLetter}>{(child?.name ?? 'S')[0]}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 18, fontWeight: '900', color: colors.textMain }}>{child?.name ?? 'Student'}</Text>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: '#BAA467', fontWeight: '600', marginTop: 1 }}>{child?.grade ?? ''}</Text>
                </View>
                {/* 4 stat chips */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { icon: 'zap',      val: (stats?.xpPoints ?? 0).toLocaleString(), sub: 'XP',         color: gold },
                    { icon: 'award',    val: `Lv.${stats?.level ?? 1}`,               sub: 'LEVEL',      color: goldLight },
                    { icon: 'activity', val: `${stats?.currentStreak ?? 0}`,           sub: 'DAY STREAK', color: gold },
                    { icon: 'clock',    val: formatStudyTime(stats?.studyTimeMinutes ?? 0), sub: 'STUDY TIME', color: gold },
                  ].map(item => (
                    <View key={item.sub} style={[styles.heroChip, { backgroundColor: item.color + '12', borderColor: item.color + '30' }]}>
                      <Feather name={item.icon as any} size={12} color={item.color} />
                      <Text style={{ fontFamily: fonts.serif, fontSize: 14, fontWeight: '900', color: item.color, marginTop: 2 }}>{item.val}</Text>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 8, fontWeight: '700', color: item.color + '90', letterSpacing: 0.5 }}>{item.sub}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── ROW 2: Curriculum Progress + Weekly Chart ── */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {/* Curriculum Progress */}
                <View style={[styles.card, { flex: 4, backgroundColor: bgCard, borderColor: borderCol }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <View style={[styles.secIcon, { backgroundColor: gold + '20', borderWidth: 1, borderColor: gold + '40' }]}>
                      <Feather name="book-open" size={12} color={gold} />
                    </View>
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.textMain }]}>Curriculum Progress</Text>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 10, color: colors.textDim }}>{completedTopics.length} of {totalTopics} topics completed</Text>
                    </View>
                  </View>

                  {/* Circular ring + milestone row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <CircularProgress pct={progressPct} size={110} strokeWidth={10} color={gold} />
                    <View style={{ flex: 1 }}>
                      {/* Milestone dots */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        {[0, 25, 50, 75, 100].map(m => {
                          const reached = progressPct >= m;
                          return (
                            <View key={m} style={{ alignItems: 'center', gap: 3 }}>
                              <View style={[styles.mileDot, { backgroundColor: reached ? gold : (isDark ? '#1E1A0E' : AV.sand), borderColor: reached ? gold : borderCol }]}>
                                {reached && <Feather name="check" size={7} color="#fff" />}
                              </View>
                              <Text style={{ fontFamily: fonts.serif, fontSize: 8, color: reached ? gold : colors.textDim }}>{m}%</Text>
                            </View>
                          );
                        })}
                      </View>
                      {/* Progress bar */}
                      <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1E1A0E' : AV.sand }]}>
                        <LinearGradient colors={['#BAA467', '#C9B078']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${Math.max(progressPct, 2)}%` as any }]} />
                      </View>
                    </View>
                  </View>
                </View>

                {/* This Week — LeetCode heatmap style */}
                <View style={[styles.card, { flex: 6, backgroundColor: bgCard, borderColor: borderCol }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <View style={[styles.secIcon, { backgroundColor: gold + '20', borderWidth: 1, borderColor: gold + '40' }]}>
                      <Feather name="bar-chart-2" size={12} color={gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.textMain }]}>This Week</Text>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 10, color: colors.textDim }}>{formatStudyTime(totalWeekMins)} total</Text>
                    </View>
                    <View style={[styles.goalBadge, { backgroundColor: gold + '15', borderColor: gold + '30' }]}>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 9, fontWeight: '700', color: gold }}>Goal: 2h/day</Text>
                    </View>
                  </View>

                  {/* Bar chart with dashed goal line */}
                  <View style={{ position: 'relative', marginTop: 4 }}>
                    {/* Dashed 2h goal line — positioned at exact 2h height within the bar track */}
                    {Platform.OS === 'web' ? (() => {
                      // barTrack height=72, starts at paddingTop(10)+labelH(11)+gap(4) = 25 from barsRow top
                      const BAR_H = 72;
                      const BAR_TOP = 25; // label(11) + gap(4) + paddingTop(10)
                      const goalFrac = Math.min(120 / actMax, 1); // fraction of max that = 2h
                      const goalLineTop = BAR_TOP + BAR_H * (1 - goalFrac);
                      return (
                        // @ts-ignore
                        <svg width="100%" height="2" style={{ position: 'absolute', top: goalLineTop, left: 0, zIndex: 1 }}>
                          <line x1="0" y1="1" x2="100%" y2="1" stroke={gold} strokeWidth="1"
                            strokeDasharray="5,4" opacity="0.6" />
                        </svg>
                      );
                    })() : null}
                    <View style={styles.barsRow}>
                      {WEEK_DAYS.map((day, i) => {
                        const mins = weekly[i];
                        const maxH = 72;
                        const barH = Math.max(4, Math.min(mins / actMax, 1) * maxH);
                        const met = mins >= 120;
                        const hasData = mins > 0;
                        return (
                          <View key={day} style={styles.barWrapper}>
                            <Text style={[styles.barTimeLabel, { color: hasData ? (met ? gold : gold) : 'transparent' }]}>
                              {formatStudyTime(mins)}
                            </Text>
                            <View style={[styles.barTrack, { backgroundColor: isDark ? '#1A1608' : AV.sand }]}>
                              {hasData ? (
                                <LinearGradient
                                  colors={met ? [gold, goldLight] : [gold, '#D4937A']}
                                  style={[styles.barFill, { height: barH }]}
                                />
                              ) : (
                                <View style={[styles.barFill, { height: 4, backgroundColor: isDark ? '#1E1A0E' : AV.sand }]} />
                              )}
                            </View>
                            <Text style={[styles.barDayLabel, {
                              color: met ? gold : colors.textDim,
                              fontWeight: met ? '700' : '400',
                            }]}>{day}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>

              {/* ── ROW 3: Subject Progress + Practice Tests + AI Insights ── */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>

                {/* Subject Progress */}
                <View style={[styles.card, { flex: 3, backgroundColor: bgCard, borderColor: borderCol }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <View style={[styles.secIcon, { backgroundColor: gold + '20', borderWidth: 1, borderColor: gold + '40' }]}>
                      <Feather name="book" size={12} color={gold} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.textMain }]}>Subject Progress</Text>
                  </View>

                  {subjectProgress.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 11, color: colors.textDim, textAlign: 'center' }}>Complete topics to see subject breakdown</Text>
                    </View>
                  ) : (
                    subjectProgress.map((s, i) => (
                      <View key={s.label} style={{ marginBottom: i < subjectProgress.length - 1 ? 11 : 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <View style={[styles.subjectIcon, { backgroundColor: gold + '20', borderWidth: 1, borderColor: gold + '40' }]}>
                            <Feather name={s.icon as any} size={13} color={gold} />
                          </View>
                          <Text style={{ flex: 1, fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', color: colors.textMain }}>{s.label}</Text>
                          <Text style={{ fontFamily: fonts.serif, fontSize: 12, fontWeight: '800', color: gold }}>{s.pct}%</Text>
                        </View>
                        <View style={[styles.subjTrack, { backgroundColor: isDark ? '#1E1A0E' : AV.sand, marginLeft: 38 }]}>
                          <LinearGradient
                            colors={[gold, goldLight]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={[styles.subjFill, { width: `${Math.max(s.pct, 3)}%` as any }]}
                          />
                        </View>
                      </View>
                    ))
                  )}

                </View>

                {/* Practice Tests */}
                <View style={[styles.card, { flex: 4, backgroundColor: bgCard, borderColor: borderCol }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <View style={[styles.secIcon, { backgroundColor: gold + '20', borderWidth: 1, borderColor: gold + '40' }]}>
                      <Feather name="clipboard" size={12} color={gold} />
                    </View>
                    <Text style={[styles.cardTitle, { flex: 1, color: colors.textMain }]}>Practice Tests</Text>
                    {topics.length > 0 && (
                      <View style={[styles.pill, { backgroundColor: gold + '15', borderColor: gold + '30' }]}>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 9, fontWeight: '700', color: gold }}>
                          {topics.filter((t: any) => t.passed).length} passed
                        </Text>
                      </View>
                    )}
                  </View>

                  {topics.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                      <Feather name="clipboard" size={20} color={colors.textDim} />
                      <Text style={{ fontFamily: fonts.serif, fontSize: 11, color: colors.textDim, marginTop: 6 }}>No practice tests yet</Text>
                    </View>
                  ) : (
                    topics.map((t: any, i: number) => {
                      const score = t.latestScore ?? 0;
                      const passed = t.passed;
                      const scoreColor = score >= 80 ? gold : score >= 60 ? goldLight : gold;
                      return (
                        <View key={t.topic} style={[
                          styles.practiceRow,
                          { borderLeftColor: scoreColor, borderBottomColor: borderCol },
                          i < topics.length - 1 && { borderBottomWidth: 1 },
                        ]}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.textMain }} numberOfLines={1}>{t.topic}</Text>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 10, color: colors.textDim }}>
                              {t.totalAttempts} attempt{t.totalAttempts !== 1 ? 's' : ''}
                              {t.totalAttempts > 1 && t.attempts?.[0]?.score != null ? ` · Best: ${t.latestScore}%` : ''}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 18, fontWeight: '900', color: scoreColor }}>{score}%</Text>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 8, fontWeight: '800', color: passed ? gold : gold }}>{passed ? 'PASSED' : 'NOT PASSED'}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}

                  {topics.length > 0 && (
                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: borderCol, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Feather name="clock" size={10} color={colors.textDim} />
                        <Text style={{ fontFamily: fonts.serif, fontSize: 10, color: colors.textDim }}>
                          Practice time: {formatStudyTime(Math.round((practiceInsights?.summary?.totalPracticeTimeSeconds || 0) / 60))}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* AI Insights — animated stagger */}
                <View style={[styles.card, { flex: 4, backgroundColor: bgCard, borderColor: borderCol, borderTopWidth: 2, borderTopColor: gold + '60' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <View style={[styles.secIcon, { backgroundColor: gold + '20', borderWidth: 1, borderColor: gold + '40' }]}>
                      <Feather name="cpu" size={12} color={gold} />
                    </View>
                    <Text style={[styles.cardTitle, { flex: 1, color: colors.textMain }]}>AI Insights</Text>
                    {/* Pulsing dot */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: gold + '15', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: gold }} />
                      <Text style={{ fontFamily: fonts.serif, fontSize: 9, fontWeight: '700', color: gold }}>Live</Text>
                    </View>
                  </View>

                  {insightsGenerating ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }}>
                      <ActivityIndicator size="small" color={gold} />
                      <Text style={{ fontFamily: fonts.serif, fontSize: 11, color: colors.textDim, fontStyle: 'italic' }}>Analysing {child?.name}&apos;s progress...</Text>
                    </View>
                  ) : aiInsights.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                      <Feather name="cpu" size={20} color={colors.textDim} />
                      <Text style={{ fontFamily: fonts.serif, fontSize: 11, color: colors.textDim, marginTop: 6, textAlign: 'center' }}>Take practice tests to unlock AI insights</Text>
                    </View>
                  ) : (
                    aiInsights.map((ins, i) => (
                      <Animated.View key={i} style={[
                        styles.insightRow,
                        i < aiInsights.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderCol },
                        {
                          opacity: insightAnims[i],
                          transform: [{ translateY: insightAnims[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                        },
                      ]}>
                        <View style={[styles.insightIcon, { backgroundColor: ins.color + '18' }]}>
                          <Feather name={ins.icon as any} size={12} color={ins.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.textMain }} numberOfLines={1}>{ins.text}</Text>
                          <Text style={{ fontFamily: fonts.serif, fontSize: 10, color: colors.textDim, marginTop: 1 }} numberOfLines={1}>{ins.sub}</Text>
                        </View>
                      </Animated.View>
                    ))
                  )}

                </View>
              </View>

              {/* ── ROW 4: Achievements + Recommended Next Steps ── */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>

                {/* Achievements — horizontal badge style (Image #9) */}
                <View style={[styles.card, { flex: 5, backgroundColor: bgCard, borderColor: borderCol }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <View style={[styles.secIcon, { backgroundColor: gold + '20', borderWidth: 1, borderColor: gold + '40' }]}>
                      <Feather name="award" size={12} color={gold} />
                    </View>
                    <Text style={[styles.cardTitle, { flex: 1, color: colors.textMain }]}>Achievements</Text>
                  </View>

                  {achievements.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 11, color: colors.textDim }}>Keep learning to earn achievements!</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {achievements.map((a, i) => (
                        <View key={i} style={[styles.achieveBadge, { backgroundColor: gold + '10', borderColor: gold + '25' }]}>
                          <View style={[styles.achieveBadgeIcon, { backgroundColor: gold + '25', borderWidth: 1, borderColor: gold + '50' }]}>
                            <Feather name={a.icon as any} size={18} color={gold} />
                          </View>
                          <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '800', color: colors.textMain, marginTop: 8, textAlign: 'center' }}>{a.label}</Text>
                          <Text style={{ fontFamily: fonts.serif, fontSize: 9, color: colors.textDim, marginTop: 2, textAlign: 'center' }}>{a.sub}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Topics to Review — weak areas parent should know about */}
                <View style={[styles.card, { flex: 5, backgroundColor: bgCard, borderColor: borderCol }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <View style={[styles.secIcon, { backgroundColor: gold + '20', borderWidth: 1, borderColor: gold + '40' }]}>
                      <Feather name="alert-circle" size={12} color={gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.textMain }]}>Topics to Review</Text>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 9, color: colors.textDim }}>Encourage your child to revisit these</Text>
                    </View>
                  </View>

                  {topics.length === 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}>
                      <View style={[styles.insightIcon, { backgroundColor: gold + '18' }]}>
                        <Feather name="info" size={14} color={gold} />
                      </View>
                      <View>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.textMain }}>No practice tests taken yet</Text>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 10, color: colors.textDim }}>Weak areas will show here once your child starts practicing</Text>
                      </View>
                    </View>
                  ) : topics.filter(t => !t.passed).length === 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}>
                      <View style={[styles.insightIcon, { backgroundColor: gold + '18' }]}>
                        <Feather name="check-circle" size={14} color={gold} />
                      </View>
                      <View>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.textMain }}>All tests passed!</Text>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 10, color: colors.textDim }}>No weak areas to report</Text>
                      </View>
                    </View>
                  ) : (
                    topics.filter(t => !t.passed).map((t: any, i: number) => {
                      const score = t.latestScore ?? 0;
                      return (
                        <View key={t.topic} style={[
                          styles.insightRow,
                          i < topics.filter((x: any) => !x.passed).length - 1 && { borderBottomWidth: 1, borderBottomColor: borderCol },
                        ]}>
                          <View style={[styles.insightIcon, { backgroundColor: gold + '18' }]}>
                            <Feather name="alert-circle" size={12} color={gold} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.textMain }} numberOfLines={1}>{t.topic}</Text>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 10, color: colors.textDim }}>
                              {t.totalAttempts} attempt{t.totalAttempts !== 1 ? 's' : ''} · scored {score}%
                            </Text>
                          </View>
                          <View style={[styles.pill, { backgroundColor: gold + '15', borderColor: gold + '30' }]}>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 9, fontWeight: '800', color: gold }}>{score}%</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
