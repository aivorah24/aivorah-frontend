import React, { useMemo, useState } from 'react';
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
import { useChildDeepLink } from '../../../hooks/useChildDeepLink';
import type { Challenge } from './services/parentChallengesService';

export default function ParentChallengesScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    children, selectedIdx, setSelectedIdx, child,
    childStats, loadingStats,
    challenges, loadingCh, challengesChildId,
    challengeGroups,
    refresh,
  } = useParentChallenges();

  // Notification deep link: the exact challenge is pinned at the top, highlighted.
  const [pinned, setPinned] = useState<Challenge | null>(null);
  const [missingNotice, setMissingNotice] = useState(false);
  useChildDeepLink({
    route, navigation, children, selectedIdx, setSelectedIdx,
    items: challenges, itemsChildId: challengesChildId,
    onOpen: (ch) => { setPinned(ch); setMissingNotice(!ch); },
  });
  const pinnedLive = pinned && challengesChildId === child?.id ? (challenges.find(c => c.id === pinned.id) ?? pinned) : null;

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

          {missingNotice && (
            <TouchableOpacity onPress={() => setMissingNotice(false)} activeOpacity={0.8} testID="deeplink-missing-notice"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.accentYellow + '40', backgroundColor: colors.accentYellow + '10' }}>
              <Feather name="info" size={14} color={colors.accentYellow} />
              <Text style={{ flex: 1, color: colors.textMuted, fontSize: 13 }}>That challenge is no longer available.</Text>
              <Feather name="x" size={14} color={colors.textDim} />
            </TouchableOpacity>
          )}

          {pinnedLive && (
            <View testID={`deeplink-challenge-${pinnedLive.id}`}
              style={{ borderWidth: 2, borderColor: colors.accentYellow, borderRadius: 16, padding: 10, gap: 8, backgroundColor: colors.accentYellow + '0C' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="bell" size={13} color={colors.accentYellow} />
                <Text style={{ flex: 1, color: colors.accentYellow, fontSize: 12, fontWeight: '700' }}>From your notification · {child?.name}</Text>
                <TouchableOpacity onPress={() => setPinned(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} testID="deeplink-dismiss">
                  <Feather name="x" size={14} color={colors.textDim} />
                </TouchableOpacity>
              </View>
              <ChallengeCard ch={pinnedLive} colors={colors} styles={styles} onAssign={() => openAssign(pinnedLive)} />
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
              {challengeGroups.map((group, idx) => (
                <View key={group.key}>
                  <View style={[styles.sectionHeader, idx > 0 && { marginTop: spacing.sm }]}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.accentYellow + '22' }]}>
                      <Feather name="award" size={15} color={colors.accentYellow} />
                    </View>
                    <View>
                      <Text style={styles.sectionLabel}>{group.label}</Text>
                      <Text style={styles.sectionDesc}>{group.items.length} {group.items.length === 1 ? 'challenge' : 'challenges'} for {child.name}</Text>
                    </View>
                  </View>
                  <View style={styles.cardGrid}>
                    {group.items.map(ch => (
                      <ChallengeCard key={ch.id} ch={ch} colors={colors} styles={styles} onAssign={() => openAssign(ch)} />
                    ))}
                  </View>
                </View>
              ))}

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
