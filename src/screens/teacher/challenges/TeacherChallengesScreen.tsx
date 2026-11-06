import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';
import DatePicker from '../../../components/common/DatePicker';
import { makeStyles } from './styles';
import { useTeacherChallenges } from './hooks/useTeacherChallenges';
import { useTeacherLeaderboard } from './hooks/useTeacherLeaderboard';
import { useAssignChallenge } from './hooks/useAssignChallenge';
import ChallengeCard from './components/ChallengeCard';
import AssignChallengeModal, { filterStudentsForChallenge } from './components/AssignChallengeModal';
import { StatCard, PodiumCard, WeeklyChart, initials } from './components/LeaderboardComponents';
import FilterChips from './components/FilterChips';
import {
  LeaderboardPeriod, PERIOD_OPTIONS, DEFAULT_PERIOD,
  localDateKey, topPerformersTitle, xpStatLabel,
} from './utils/leaderboardPeriod';

const GOLD = '#D9A93E';

export default function TeacherChallengesScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const gold = colors.accentYellow;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const teacherCurriculum = (user as any)?.teaches?.[0]?.curriculum || (user as any)?.curriculum || 'IB PYP';

  const [activeTab, setActiveTab] = useState<'challenges' | 'leaderboard'>('challenges');

  const { selectedGrade, setSelectedGrade, fetchedGrades, challenges, loading, students, assignedByChallenge, refreshAssignments } =
    useTeacherChallenges(user?.email, teacherCurriculum);
  // Leaderboard filters: period (podium + table) and one of the teacher's
  // grades ('' = "By XP", every grade they teach).
  const [lbPeriod, setLbPeriod]         = useState<LeaderboardPeriod>(DEFAULT_PERIOD);
  const [lbCustomDate, setLbCustomDate] = useState('');
  const [lbGrade, setLbGrade]           = useState('');
  const { leaderboard, lbLoading, rankChange, weekly, totalXP, activeStudents, yourEntry, yourAbove, daysLeft } =
    useTeacherLeaderboard(activeTab, user?.email, (user as any)?.name,
      { period: lbPeriod, customDate: lbCustomDate, classGrade: lbGrade });
  const assign = useAssignChallenge(user?.email, refreshAssignments);
  const [lbExpanded, setLbExpanded] = useState(false);
  const todayKey = localDateKey();

  const gradeTabs = fetchedGrades.length > 0 ? fetchedGrades : ['Grade 3', 'Grade 4', 'Grade 5'];
  // Only the teacher's real grades (from their saved preferences) — never the
  // placeholder tabs above, which the class leaderboard would answer with nothing.
  const lbGradeOptions = useMemo(
    () => [{ key: '', label: 'By XP' }, ...fetchedGrades.map(g => ({ key: g, label: g }))],
    [fetchedGrades],
  );
  // A grade removed in Settings falls back to all grades.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keeps the filter valid when the teacher's grade list changes
    if (lbGrade && fetchedGrades.length > 0 && !fetchedGrades.includes(lbGrade)) setLbGrade('');
  }, [fetchedGrades, lbGrade]);

  const selectPeriod = (p: LeaderboardPeriod) => {
    setLbPeriod(p);
    setLbExpanded(false);
    // Custom starts on today; the calendar below the chips picks another day.
    if (p === 'custom' && !lbCustomDate) setLbCustomDate(todayKey);
  };
  const selectGrade = (g: string) => { setLbGrade(g); setLbExpanded(false); };
  const podium = [leaderboard[1], leaderboard[0], leaderboard[2]];
  const emptyClassText = lbGrade
    ? `No students in ${lbGrade} yet.`
    : 'No students in this class yet. Link students to see rankings.';

  // Group challenges by their real `category` from the API, not a fixed
  // list of `type` values — fixed 2026-09-02, same bug class as Parent
  // Challenges (a hardcoded type filter silently drops every challenge
  // once the seeded taxonomy grows past whatever was hardcoded).
  const groupedChallenges = useMemo(() => {
    const groups = new Map<string, typeof challenges>();
    challenges.forEach(ch => {
      const key = ch.category || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ch);
    });
    return Array.from(groups.entries());
  }, [challenges]);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Challenges"
          subtitle="Assign competitive challenges to students"
          onMenuPress={() => navigation.openDrawer()}
        />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'challenges' && styles.toggleActive]}
              onPress={() => setActiveTab('challenges')} activeOpacity={0.8}
            >
              <Feather name="target" size={14} color={activeTab === 'challenges' ? gold : colors.textMuted} />
              <Text style={[styles.toggleText, activeTab === 'challenges' && styles.toggleTextActive]}>Challenges</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === 'leaderboard' && styles.toggleActive]}
              onPress={() => setActiveTab('leaderboard')} activeOpacity={0.8}
            >
              <Feather name="award" size={14} color={activeTab === 'leaderboard' ? gold : colors.textMuted} />
              <Text style={[styles.toggleText, activeTab === 'leaderboard' && styles.toggleTextActive]}>Leaderboard</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'challenges' ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 40 }}
                contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {gradeTabs.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.gradeChip, selectedGrade === g && styles.gradeChipActive]}
                    onPress={() => setSelectedGrade(g)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.gradeChipText, selectedGrade === g && styles.gradeChipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {loading ? (
                <ActivityIndicator color={colors.accentYellow} style={{ paddingVertical: 32 }} />
              ) : (
                <>
                  {groupedChallenges.map(([category, items]) => (
                    <View key={category}>
                      <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>{category}</Text>
                      <View style={styles.challengeGrid}>
                        {items.map(ch => (
                          <ChallengeCard
                            key={ch.id} ch={ch} colors={colors} isDark={isDark} styles={styles}
                            onAssign={() => assign.openAssign(ch)}
                            assignedCount={(assignedByChallenge[ch.id] ?? []).length}
                            eligibleCount={filterStudentsForChallenge(students, ch, '').length}
                          />
                        ))}
                      </View>
                    </View>
                  ))}

                  {challenges.length === 0 && (
                    <View style={styles.emptyState}>
                      <Feather name="inbox" size={32} color={colors.textDim} />
                      <Text style={styles.emptyText}>No challenges for {selectedGrade} yet.</Text>
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
              <View style={styles.lbWrap}>
                <View style={styles.statRow}>
                  <StatCard styles={styles} icon="users"    tint={gold} value={String(leaderboard.length)} label={lbGrade ? `Students in ${lbGrade}` : 'Students'} />
                  <StatCard styles={styles} icon="zap"      tint={GOLD} value={String(challenges.length)} label="Active Challenges" />
                  <StatCard styles={styles} icon="star"     tint={GOLD} value={totalXP.toLocaleString()} label={xpStatLabel(lbPeriod, lbCustomDate)} />
                  {daysLeft != null ? (
                    <StatCard styles={styles} icon="calendar" tint={colors.textMuted} value={String(daysLeft)} label={lbPeriod === 'month' ? 'Days Left This Month' : 'Days Left This Week'} />
                  ) : (
                    <StatCard styles={styles} icon="activity" tint={colors.textMuted} value={String(activeStudents)} label="Students Who Earned XP" />
                  )}
                </View>

                {/* zIndex keeps the calendar popup above the table below it */}
                <View style={[styles.panel, { zIndex: 2 }]}>
                  <View style={styles.filterHeadRow}>
                    <View style={styles.filterTitle}>
                      <Feather name="award" size={16} color={GOLD} />
                      <Text style={styles.panelTitle}>{topPerformersTitle(lbPeriod, lbCustomDate)}</Text>
                    </View>
                    <FilterChips label="Leaderboard period" options={PERIOD_OPTIONS} value={lbPeriod} onChange={selectPeriod} styles={styles} />
                  </View>
                  {lbPeriod === 'custom' && (
                    <View style={styles.datePickerWrap}>
                      <DatePicker
                        value={lbCustomDate}
                        onChange={d => { if (d) { setLbCustomDate(d); setLbExpanded(false); } }}
                        placeholder="Pick a date"
                        maxDate={todayKey}
                      />
                    </View>
                  )}
                  {lbLoading ? (
                    <ActivityIndicator color={colors.accentYellow} style={{ paddingVertical: 32 }} />
                  ) : leaderboard.length === 0 ? (
                    <Text style={styles.lbEmptyText}>{emptyClassText}</Text>
                  ) : (
                    <View style={styles.podiumRow}>
                      {podium.map((entry, i) => entry && (
                        <PodiumCard key={entry.id} entry={entry} place={[2, 1, 3][i]} colors={colors} styles={styles} isDark={isDark} elevated={i === 1} />
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.lbBottomRow}>
                  <View style={styles.lbTablePanel}>
                    <View style={styles.lbPanelHead}>
                      <View style={styles.filterTitle}>
                        <Feather name="award" size={15} color={GOLD} />
                        <Text style={styles.panelTitle}>Live Class Leaderboard</Text>
                      </View>
                      <FilterChips label="Leaderboard grade" options={lbGradeOptions} value={lbGrade} onChange={selectGrade} styles={styles} />
                    </View>

                    <View style={styles.colHeadRow}>
                      <Text style={[styles.colHead, styles.colRankW]}>Rank</Text>
                      <Text style={[styles.colHead, { flex: 1 }]}>Student</Text>
                      <Text style={[styles.colHead, styles.colGradeHead]}>Grade</Text>
                      <Text style={[styles.colHead, styles.colXPHead]}>XP</Text>
                      <Text style={[styles.colHead, styles.colChangeHead]}>Change</Text>
                    </View>

                    {(() => {
                      if (lbLoading) return <ActivityIndicator color={colors.accentYellow} style={{ paddingVertical: 24 }} />;
                      if (leaderboard.length === 0) return <Text style={styles.lbEmptyText}>{emptyClassText}</Text>;
                      const rest  = leaderboard.slice(3);
                      const shown = lbExpanded ? rest : rest.slice(0, 5);
                      if (rest.length === 0) {
                        return (
                          <Text style={{ color: colors.textDim, textAlign: 'center', paddingVertical: 22, fontSize: 12 }}>
                            All class members are on the podium above.
                          </Text>
                        );
                      }
                      return (
                        <>
                          {shown.map((s, i) => {
                            const ch = rankChange[s.id] ?? 0;
                            return (
                              <View key={s.id} style={[styles.tableRow, i < shown.length - 1 && styles.tableRowBorder]}>
                                <View style={styles.colRankW}>
                                  <View style={styles.rankPill}><Text style={styles.rankPillText}>{s.rank}</Text></View>
                                </View>
                                <View style={styles.cellStudent}>
                                  <View style={[styles.tableAvatar, { backgroundColor: gold + '20' }]}>
                                    <Text style={[styles.tableInitials, { color: gold }]}>{initials(s.name)}</Text>
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.tableName} numberOfLines={1}>{s.name}</Text>
                                    <Text style={styles.tableSub} numberOfLines={1}>{s.grade} · {s.streak}d streak</Text>
                                  </View>
                                </View>
                                <Text style={[styles.cellGrade, styles.colGradeHead]}>{(s.grade || '').replace('Grade ', '')}</Text>
                                <View style={styles.colXPCell}>
                                  <Text style={styles.cellXP}>{s.score.toLocaleString()} <Text style={styles.cellXPUnit}>XP</Text></Text>
                                </View>
                                <View style={styles.colChangeCell}>
                                  {ch > 0 ? (
                                    <><Feather name="arrow-up" size={12} color={colors.accentGreen} /><Text style={[styles.changeText, { color: colors.accentGreen }]}>{ch}</Text></>
                                  ) : ch < 0 ? (
                                    <><Feather name="arrow-down" size={12} color={colors.accentRed} /><Text style={[styles.changeText, { color: colors.accentRed }]}>{Math.abs(ch)}</Text></>
                                  ) : (
                                    <Text style={[styles.changeText, { color: colors.textDim }]}>—</Text>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                          {rest.length > 5 && (
                            <TouchableOpacity style={styles.viewFullBtn} onPress={() => setLbExpanded(v => !v)} activeOpacity={0.7}>
                              <Text style={styles.viewFullText}>{lbExpanded ? 'Show Less' : 'View Full Leaderboard'}</Text>
                              <Feather name={lbExpanded ? 'chevron-up' : 'chevron-right'} size={15} color={gold} />
                            </TouchableOpacity>
                          )}
                        </>
                      );
                    })()}
                  </View>

                  {yourEntry && (
                    <View style={styles.lbSideCol}>
                      <View style={styles.sideCard}>
                        <View style={styles.panelHeadRow}>
                          <Feather name="user" size={15} color={GOLD} />
                          <Text style={styles.panelTitle}>Your Rank</Text>
                        </View>
                        <Text style={styles.yourRankNum}>#{yourEntry.rank}</Text>
                        <Text style={styles.yourRankName}>{yourEntry.name}</Text>
                        <Text style={styles.yourRankXP}>{yourEntry.score.toLocaleString()} XP</Text>
                        {(rankChange[yourEntry.id] ?? 0) !== 0 && (
                          <Text style={[styles.yourRankDelta, { color: (rankChange[yourEntry.id] ?? 0) > 0 ? colors.accentGreen : colors.accentRed }]}>
                            {(rankChange[yourEntry.id] ?? 0) > 0 ? '↑' : '↓'} {Math.abs(rankChange[yourEntry.id] ?? 0)} ranks today
                          </Text>
                        )}
                        {yourAbove && (
                          <>
                            <View style={styles.progressTrack}>
                              <View style={[styles.progressFill, { width: `${Math.min(100, Math.round((yourEntry.score / Math.max(1, yourAbove.score)) * 100))}%` }]} />
                            </View>
                            <Text style={styles.progressLabel}>{Math.max(0, yourAbove.score - yourEntry.score).toLocaleString()} XP to reach Rank #{yourAbove.rank}</Text>
                            <Text style={styles.progressSub}>{yourEntry.score.toLocaleString()} / {yourAbove.score.toLocaleString()} XP</Text>
                          </>
                        )}
                      </View>

                      <View style={styles.sideCard}>
                        <Text style={styles.panelTitle}>Weekly Progress</Text>
                        <WeeklyChart data={weekly} styles={styles} />
                      </View>
                    </View>
                  )}
                </View>
              </View>
          )}
        </ScrollView>
      </View>

      <AssignChallengeModal
        visible={assign.assignModal}
        challenge={assign.assignChallengeItem}
        students={students}
        studentSearch={assign.studentSearch}
        setStudentSearch={assign.setStudentSearch}
        selectedStudent={assign.selectedStudent}
        setSelectedStudent={assign.setSelectedStudent}
        assigning={assign.assigning}
        assignError={assign.assignError}
        assignSuccess={assign.assignSuccess}
        assignDueDate={assign.assignDueDate}
        setAssignDueDate={assign.setAssignDueDate}
        onClose={assign.closeAssign}
        onAssign={assign.doAssign}
        colors={colors}
        styles={styles}
        assignedStudentIds={assign.assignChallengeItem ? assignedByChallenge[assign.assignChallengeItem.id] ?? [] : []}
      />
    </ScreenLayout>
  );
}
