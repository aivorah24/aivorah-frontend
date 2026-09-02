import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';

import { useParentChallenges } from './hooks/useParentChallenges';
import { useAssignChallenge } from './hooks/useAssignChallenge';
import ChallengeCard from './components/ChallengeCard';
import AssignChallengeModal from './components/AssignChallengeModal';
import { makeStyles } from './styles';

export default function ParentChallengesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    children, selectedIdx, setSelectedIdx, child,
    childStats, loadingStats,
    challenges, loadingCh,
    schoolChallenges, olympiadChallenges, advancedPractice,
    refresh,
  } = useParentChallenges();

  const {
    assignModal, assignChallengeTarget, assigning, assignError, assignSuccess,
    assignDueDate, setAssignDueDate, openAssign, closeAssign, doAssign, getDueDateLabel,
  } = useAssignChallenge(refresh);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Challenges"
          subtitle="School challenges, olympiad prep, and advanced practice"
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childRow} contentContainerStyle={{ gap: 8 }}>
              {children.map((c, i) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.childTab, i === selectedIdx && styles.childTabActive]}
                  onPress={() => setSelectedIdx(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.childTabName, i === selectedIdx && styles.childTabNameActive]}>{c.name}</Text>
                  <Text style={[styles.childTabGrade, i === selectedIdx && styles.childTabGradeActive]}>{c.grade}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {child && (
            <View style={styles.statsRow}>
              {loadingStats ? (
                <ActivityIndicator size="small" color={colors.accentYellow} />
              ) : (
                <>
                  <View style={styles.statItem}>
                    <Feather name="star" size={14} color={colors.accentYellow} />
                    <Text style={styles.statValue}>{childStats?.xpPoints?.toLocaleString() ?? '—'}</Text>
                    <Text style={styles.statLabel}>XP</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Feather name="check-circle" size={14} color={colors.accentGreen} />
                    <Text style={styles.statValue}>{childStats?.challengesCompleted ?? '—'}</Text>
                    <Text style={styles.statLabel}>Done</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Feather name="zap" size={14} color={colors.accentRed} />
                    <Text style={styles.statValue}>{childStats?.currentStreak ?? '—'}d</Text>
                    <Text style={styles.statLabel}>Streak</Text>
                  </View>
                </>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.leaderCTA, { borderColor: colors.accentYellow + '40', backgroundColor: colors.accentYellow + '0C' }]}
            onPress={() => navigation.navigate('ParentLeaderboard')}
            activeOpacity={0.8}
          >
            <Feather name="award" size={16} color={colors.accentYellow} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.leaderCTATitle, { color: colors.accentYellow }]}>Class Leaderboard</Text>
              <Text style={styles.leaderCTASub}>See how {child?.name ?? 'your child'} ranks in the class</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.accentYellow} />
          </TouchableOpacity>

          {!child ? (
            <View style={styles.emptyState}>
              <Feather name="user" size={28} color={colors.textDim} />
              <Text style={styles.emptyText}>No child linked to your account yet.</Text>
            </View>
          ) : loadingCh ? (
            <ActivityIndicator color={colors.accentYellow} style={{ paddingVertical: 32 }} />
          ) : (
            <>
              {schoolChallenges.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.accentYellow + '22' }]}>
                      <Feather name="award" size={15} color={colors.accentYellow} />
                    </View>
                    <View>
                      <Text style={styles.sectionLabel}>School Challenges</Text>
                      <Text style={styles.sectionDesc}>School-wide competitive challenges for {child.name}</Text>
                    </View>
                  </View>
                  <View style={styles.cardGrid}>
                    {schoolChallenges.map(ch => (
                      <ChallengeCard key={ch.id} ch={ch} colors={colors} styles={styles} onAssign={() => openAssign(ch)} />
                    ))}
                  </View>
                </>
              )}

              {olympiadChallenges.length > 0 && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: spacing.sm }]}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.accentYellow + '18' }]}>
                      <Feather name="target" size={15} color={colors.accentYellow} />
                    </View>
                    <View>
                      <Text style={styles.sectionLabel}>Olympiad-Style Questions</Text>
                      <Text style={styles.sectionDesc}>Competitive exam prep — logical reasoning and beyond</Text>
                    </View>
                  </View>
                  <View style={styles.cardGrid}>
                    {olympiadChallenges.map(ch => (
                      <ChallengeCard key={ch.id} ch={ch} colors={colors} styles={styles} onAssign={() => openAssign(ch)} />
                    ))}
                  </View>
                </>
              )}

              {advancedPractice.length > 0 && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: spacing.sm }]}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.accentOrange + '18' }]}>
                      <Feather name="trending-up" size={15} color={colors.accentOrange} />
                    </View>
                    <View>
                      <Text style={styles.sectionLabel}>Advanced Practice</Text>
                      <Text style={styles.sectionDesc}>Push beyond normal assignments</Text>
                    </View>
                  </View>
                  <View style={styles.cardGrid}>
                    {advancedPractice.map(ch => (
                      <ChallengeCard key={ch.id} ch={ch} colors={colors} styles={styles} onAssign={() => openAssign(ch)} />
                    ))}
                  </View>
                </>
              )}

              {challenges.length === 0 && (
                <View style={styles.emptyState}>
                  <Feather name="inbox" size={28} color={colors.textDim} />
                  <Text style={styles.emptyText}>No challenges available for {child.grade} yet.</Text>
                </View>
              )}
            </>
          )}

          <View style={styles.infoCard}>
            <Feather name="info" size={14} color={colors.accentYellow} />
            <Text style={styles.infoText}>
              You can assign challenges to {child?.name ?? 'your child'} directly. Teachers can also assign school and olympiad challenges from their dashboard.
            </Text>
          </View>

        </ScrollView>
      </View>

      <AssignChallengeModal
        visible={assignModal}
        onClose={closeAssign}
        colors={colors}
        styles={styles}
        challenge={assignChallengeTarget}
        child={child}
        assigning={assigning}
        assignError={assignError}
        assignSuccess={assignSuccess}
        assignDueDate={assignDueDate}
        setAssignDueDate={setAssignDueDate}
        getDueDateLabel={getDueDateLabel}
        onConfirm={() => doAssign(child)}
      />
    </ScreenLayout>
  );
}
