import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';
import { makeStyles } from './styles';
import { useTeacherChallenges } from './hooks/useTeacherChallenges';
import { useTeacherLeaderboard } from './hooks/useTeacherLeaderboard';
import { useAssignChallenge } from './hooks/useAssignChallenge';
import ChallengeCard from './components/ChallengeCard';
import AssignChallengeModal, { filterStudentsForChallenge } from './components/AssignChallengeModal';
import { StatCard, PodiumCard, WeeklyChart, initials } from './components/LeaderboardComponents';

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
  const { leaderboard, lbLoading, rankChange, weekly, totalXP, yourEntry, yourAbove, daysLeft, showPodium } =
    useTeacherLeaderboard(activeTab, user?.email, (user as any)?.name);
  const assign = useAssignChallenge(user?.email, refreshAssignments);
  const [lbExpanded, setLbExpanded] = useState(false);

  const gradeTabs = fetchedGrades.length > 0 ? fetchedGrades : ['Grade 3', 'Grade 4', 'Grade 5'];

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
            lbLoading ? (
              <ActivityIndicator color={colors.accentYellow} style={{ paddingVertical: 48 }} />
            ) : leaderboard.length === 0 ? (
              <View style={styles.leaderCard}>
                <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 24, fontSize: 13 }}>
                  No students in this class yet. Link students to see rankings.
                </Text>
              </View>
            ) : (
              <View style={styles.lbWrap}>
                <View style={styles.statRow}>
                  <StatCard styles={styles} icon="users"    tint={gold} value={String(leaderboard.length)} label="Students" />
                  <StatCard styles={styles} icon="zap"      tint={GOLD} value={String(challenges.length)} label="Active Challenges" />
                  <StatCard styles={styles} icon="star"     tint={GOLD} value={totalXP.toLocaleString()} label="Total XP Earned" />
                  <StatCard styles={styles} icon="calendar" tint={colors.textMuted} value={String(daysLeft)} label="Days Left" />
                </View>

                {showPodium && (
                  <View style={styles.panel}>
                    <View style={styles.panelHeadRow}>
                      <Feather name="award" size={16} color={GOLD} />
                      <Text style={styles.panelTitle}>Top Performers This Week</Text>
                      <View style={styles.periodChip}>
                        <Text style={styles.periodChipText}>This Week</Text>
                        <Feather name="chevron-down" size={13} color={colors.textMuted} />
                      </View>
                    </View>
                    <View style={styles.podiumRow}>
                      <PodiumCard entry={leaderboard[1]} place={2} colors={colors} styles={styles} isDark={isDark} />
                      <PodiumCard entry={leaderboard[0]} place={1} colors={colors} styles={styles} isDark={isDark} elevated />
                      <PodiumCard entry={leaderboard[2]} place={3} colors={colors} styles={styles} isDark={isDark} />
                    </View>
                  </View>
                )}

                <View style={styles.lbBottomRow}>
                  <View style={styles.lbTablePanel}>
                    <View style={styles.lbPanelHead}>
                      <Feather name="award" size={15} color={GOLD} />
                      <Text style={styles.panelTitle}>Live Class Leaderboard</Text>
                      <View style={styles.periodChip}>
                        <Text style={styles.periodChipText}>By XP</Text>
                        <Feather name="chevron-down" size={13} color={colors.textMuted} />
                      </View>
                    </View>

                    <View style={styles.colHeadRow}>
                      <Text style={[styles.colHead, styles.colRankW]}>Rank</Text>
                      <Text style={[styles.colHead, { flex: 1 }]}>Student</Text>
                      <Text style={[styles.colHead, styles.colGradeHead]}>Grade</Text>
                      <Text style={[styles.colHead, styles.colXPHead]}>XP</Text>
                      <Text style={[styles.colHead, styles.colChangeHead]}>Change</Text>
                    </View>

                    {(() => {
                      const rest  = showPodium ? leaderboard.slice(3) : leaderboard;
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
            )
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
