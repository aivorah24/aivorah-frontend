import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatStudyTime } from '../../../../context/StudentDataContext';
import { RingChart } from './common/icons';
import { SectionHeader } from './common/SectionHeader';
import type { makeStyles } from '../DashboardScreen';

interface GoalsCardProps {
  styles: ReturnType<typeof makeStyles>;
  isMobile: boolean;
  isDark: boolean;
  // GOALS is a loosely-typed literal array built up in DashboardScreen (same
  // `as any` casts on .route/.caption/.sub already existed there before this
  // extraction) - kept as `any[]` rather than inventing a stricter type the
  // rest of the codebase doesn't actually enforce.
  goals: any[];
  cardBorder: string;
  goalText: string;
  goalMutedText: string;
  goalDimText: string;
  goalRingTrack: string;
  navigation: { navigate: (screen: string) => void };
}

// "Today's Goals" section — daily mission cards (Study Time / Chapters / XP)
// with a progress ring, badges, and a bottom progress bar. Renders a
// horizontal-scroll layout on mobile, a row layout on desktop; both branches
// are unchanged from the pre-extraction JSX.
export function GoalsCard({
  styles,
  isMobile,
  isDark,
  goals,
  cardBorder,
  goalText,
  goalMutedText,
  goalDimText,
  goalRingTrack,
  navigation,
}: GoalsCardProps) {
  return (
    <>
      <SectionHeader title="Today's Goals" sub="Daily missions • earn XP" onPress={() => navigation.navigate('Progress')} linkLabel="All progress" />

      {isMobile ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalsRowScroll}>
          {goals.map(g => {
            const pct = Math.round(Math.max(0, Math.min(g.pct, 1)) * 100);
            const left = Math.max(g.goal - g.raw, 0);
            const helper = left === 0 ? 'Goal unlocked' : `${g.label === 'Study Time' ? formatStudyTime(left) : left} left`;
            return (
              <TouchableOpacity key={g.label} style={[styles.goalCardMobile, { borderColor: cardBorder }]} onPress={() => navigation.navigate(g.route ?? 'Progress')} activeOpacity={0.8}>
                <LinearGradient
                  colors={isDark ? [g.pastel, '#FFFFFF'] : [g.color + '24', g.pastel]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.goalCardGradient}
                >
                  <View style={styles.goalTopRow}>
                    <View style={[styles.goalIconOrb, { backgroundColor: g.color + '35', borderColor: g.color + '60' }]}>
                      <Feather name={g.icon} size={15} color={g.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalTitle, { color: goalText }]}>{g.label}</Text>
                      <Text style={[styles.goalMeta, { color: goalMutedText }]}>Target {g.target}</Text>
                    </View>
                    <View style={[styles.goalStatusPill, { backgroundColor: g.color + '28', borderColor: g.color + '55' }]}>
                      <Text style={[styles.goalStatusTxt, { color: g.color }]}>{pct}%</Text>
                    </View>
                  </View>
                  <View style={styles.goalMidRow}>
                    <View style={styles.goalRingWrap}>
                      <RingChart progress={g.pct} color={g.color} size={72} stroke={7} track={goalRingTrack} />
                      <View style={styles.goalRingCenter}>
                        <Text style={[styles.goalPct, { color: g.color }]}>{pct}%</Text>
                        <Text style={[styles.goalRingSub, { color: goalMutedText }]}>{pct >= 100 ? 'Done' : 'Go'}</Text>
                      </View>
                    </View>
                    <View style={styles.goalValueWrap}>
                      <Text style={[styles.goalVal, { color: goalText }]}>{g.val}</Text>
                      <Text style={[styles.goalTarget, { color: goalDimText }]}>{g.caption ?? (g.sub === 'total' ? 'total completed' : 'completed today')}</Text>
                      <View style={[styles.goalMiniMeta, { backgroundColor: g.color + '25', borderColor: g.color + '50' }]}>
                        <Feather name="target" size={10} color={g.color} />
                        <Text style={[styles.goalMiniMetaTxt, { color: g.color }]}>{helper}</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.goalsRow}>
          {goals.map(g => {
            const pct = Math.round(Math.max(0, Math.min(g.pct, 1)) * 100);
            const left = Math.max(g.goal - g.raw, 0);
            const helper = left === 0 ? 'Goal unlocked' : `${g.label === 'Study Time' ? formatStudyTime(left) : left} left`;
            return (
              <TouchableOpacity key={g.label} style={[styles.goalCard, { borderColor: cardBorder }]} onPress={() => navigation.navigate(g.route ?? 'Progress')} activeOpacity={0.8}>
                <LinearGradient
                  colors={isDark ? [g.pastel, '#FFFFFF'] : [g.color + '24', g.pastel]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.goalCardGradient}
                >
                  {/* Top row: icon + title + meta, no pill (ring shows %) */}
                  <View style={styles.goalTopRow}>
                    <View style={[styles.goalIconOrb, { backgroundColor: g.color + '35', borderColor: g.color + '60' }]}>
                      <Feather name={g.icon} size={15} color={g.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalTitle, { color: goalText }]}>{g.label}</Text>
                      <Text style={[styles.goalMeta, { color: goalMutedText }]}>Target {g.target}</Text>
                    </View>
                    <View style={[styles.goalStatusPill, { backgroundColor: g.color + '28', borderColor: g.color + '55' }]}>
                      <Text style={[styles.goalStatusTxt, { color: g.color }]}>{pct}%</Text>
                    </View>
                  </View>

                  <View style={styles.goalMidRow}>
                    {/* Ring */}
                    <View style={styles.goalRingWrap}>
                      <RingChart progress={g.pct} color={g.color} size={72} stroke={7} track={goalRingTrack} />
                      <View style={styles.goalRingCenter}>
                        <Text style={[styles.goalPct, { color: g.color }]}>{pct}%</Text>
                        <Text style={[styles.goalRingSub, { color: goalMutedText }]}>{pct >= 100 ? 'Done' : 'Go'}</Text>
                      </View>
                    </View>
                    {/* Value + helper — centered vertically */}
                    <View style={styles.goalValueWrap}>
                      <Text style={[styles.goalVal, { color: goalText }]}>{g.val}</Text>
                      <Text style={[styles.goalTarget, { color: goalDimText }]}>{g.caption ?? (g.sub === 'total' ? 'total completed' : 'completed today')}</Text>
                      <View style={[styles.goalMiniMeta, { backgroundColor: g.color + '25', borderColor: g.color + '50' }]}>
                        <Feather name="target" size={10} color={g.color} />
                        <Text style={[styles.goalMiniMetaTxt, { color: g.color }]}>{helper}</Text>
                      </View>
                    </View>
                    {/* Badges — right column, evenly spaced */}
                    <View style={styles.goalBadgesRight}>
                      {g.badges.map((b: any) => (
                        <View key={b.label} style={styles.goalBadgeMedalWrap}>
                          <View style={[styles.goalBadgeMedal, {
                            backgroundColor: b.unlocked ? b.bg : '#f2f2f2',
                            borderColor:     b.unlocked ? b.color : '#e0e0e0',
                            shadowColor:     b.unlocked ? b.color : 'transparent',
                            shadowOffset:    { width: 0, height: 3 },
                            shadowOpacity:   b.unlocked ? 0.45 : 0,
                            shadowRadius:    7,
                            elevation:       b.unlocked ? 5 : 0,
                          }]}>
                            {b.unlocked && <View style={[styles.goalBadgeGlow, { backgroundColor: b.color + '18' }]} />}
                            <Feather name={b.icon} size={15} color={b.unlocked ? b.color : '#cccccc'} />
                            {b.unlocked && (
                              <View style={[styles.goalBadgeCheckDot, { backgroundColor: b.color, borderColor: '#fff' }]}>
                                <Feather name="check" size={6} color="#fff" />
                              </View>
                            )}
                          </View>
                          <Text style={[styles.goalBadgeMedalLabel, {
                            color: b.unlocked ? b.color : '#c0c0c0',
                            fontWeight: b.unlocked ? '700' : '400',
                          }]} numberOfLines={1}>{b.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={[styles.goalBar, { backgroundColor: g.color + '25' }]}>
                    <View style={[styles.goalBarFill, { width: `${Math.max(g.pct * 100, 3)}%` as any, backgroundColor: g.color }]} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );
}
