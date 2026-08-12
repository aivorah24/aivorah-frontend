import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useStudentData } from '../../../context/StudentDataContext';
import { useAuth } from '../../../context/AuthContext';

import { Scope } from './types';
import { TABS } from './constants';
import { useLeaderboard } from './hooks/useLeaderboard';
import LeaderboardPodium from './components/LeaderboardPodium';
import LeaderboardTable from './components/LeaderboardTable';
import LeaderboardRankCard from './components/LeaderboardRankCard';

export default function LeaderboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { studentId } = useStudentData();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const gold = colors.accentYellow;

  const myGrade = user?.grade;
  const mySchool = (user as any)?.school as string | undefined;
  const myCurriculum = user?.curriculum;

  const [tab, setTab] = useState<Scope>('school');

  const { leaderboard, loading, refreshing, fetchLeaderboard } = useLeaderboard(
    tab,
    myGrade,
    mySchool,
    myCurriculum
  );

  const myEntry = leaderboard.find(s => s.id === studentId) ?? null;
  const aboveEntry = myEntry ? leaderboard.find(e => e.rank === myEntry.rank - 1) ?? null : null;
  const podium = !loading && leaderboard.length >= 1 ? (
    leaderboard.length >= 3 ? [leaderboard[1], leaderboard[0], leaderboard[2]] :
    leaderboard.length === 2 ? [null, leaderboard[0], leaderboard[1]] :
    [null, leaderboard[0], null]
  ) : null;

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header 
          title="Leaderboard" 
          subtitle="See how you rank among your peers" 
          searchPlaceholder="Search students..." 
          onMenuPress={() => navigation.openDrawer()} 
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => fetchLeaderboard(true)} 
              tintColor={colors.accentYellow} 
            />
          }
        >
          {/* Top bar: live badge + school chip */}
          <View style={styles.topBar}>
            <View style={styles.liveRow}>
              <View style={[styles.liveDot, { backgroundColor: colors.accentGreen }]} />
              <Text style={[styles.liveText, { color: colors.accentGreen }]}>LIVE</Text>
              <Text style={styles.liveTitle}>Rankings</Text>
            </View>
            {!!mySchool && (
              <View style={styles.schoolChip}>
                <Feather name="home" size={13} color={gold} />
                <Text style={styles.schoolChipText} numberOfLines={1}>{mySchool}</Text>
              </View>
            )}
          </View>

          {/* Scope tabs */}
          <View style={styles.tabsRow}>
            {TABS.map(t => {
              const active = t.key === tab;
              return (
                <TouchableOpacity 
                  key={t.key} 
                  onPress={() => setTab(t.key)} 
                  activeOpacity={0.8}
                  style={[styles.tab, active && { backgroundColor: gold + '1A', borderColor: gold + '55' }]}
                >
                  <Feather name={t.icon} size={13} color={active ? gold : colors.textMuted} />
                  <Text style={[styles.tabText, { color: active ? gold : colors.textMuted }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.columns, !wide && { flexDirection: 'column' }]}>
            <View style={{ flex: 1, gap: spacing.lg }}>
              {/* Podium */}
              {podium && (
                <LeaderboardPodium 
                  podium={podium} 
                  studentId={studentId} 
                  colors={colors} 
                />
              )}

              {/* Table */}
              <LeaderboardTable 
                leaderboard={leaderboard} 
                loading={loading} 
                studentId={studentId} 
                wide={wide} 
                colors={colors} 
              />
            </View>

            {/* Rank Card */}
            {wide ? (
              <View style={{ width: 300 }}>
                <LeaderboardRankCard 
                  myEntry={myEntry} 
                  aboveEntry={aboveEntry} 
                  loading={loading} 
                  colors={colors} 
                />
              </View>
            ) : (
              <LeaderboardRankCard 
                myEntry={myEntry} 
                aboveEntry={aboveEntry} 
                loading={loading} 
                colors={colors} 
              />
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  content: { padding: spacing.xl, paddingBottom: 40, gap: spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  liveRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  liveTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: c.textMain },
  schoolChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 9, backgroundColor: c.cardDark, maxWidth: 220 },
  schoolChipText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: c.textMain },
  tabsRow: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.lg, paddingVertical: 10 },
  tabText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700' },
  columns: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
});
