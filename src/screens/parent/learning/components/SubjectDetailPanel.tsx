import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { subjectMeta } from '../constants';
import { cardStyles } from './SubjectCard';
import TopicProgressRow from './TopicProgressRow';
import { useTopicAttempts } from '../hooks/useTopicAttempts';
import { summarizeByTopic, groupByUnit, formatDuration, average, scoreColor, EMPTY_SUMMARY } from '../utils/topicAttempts';

interface PanelTopic { topic: string; unit?: string }

export default function SubjectDetailPanel({
  sub, childId, completedSet, colors, onClose, isMobile,
}: {
  sub: any;
  childId?: string;
  completedSet: Set<string>;
  colors: AppColors;
  onClose: () => void;
  isMobile: boolean;
}) {
  const meta = subjectMeta(sub.subject);
  const accent = colors.accentYellow;
  const topics: PanelTopic[] = useMemo(
    () => (sub.topics ?? []).map((t: any) => (typeof t === 'string' ? { topic: t } : t)).filter((t: PanelTopic) => t.topic),
    [sub.topics],
  );
  const { attempts, loading } = useTopicAttempts(childId, sub.subject);
  const byTopic = useMemo(() => summarizeByTopic(attempts), [attempts]);
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  const done = topics.filter(t => completedSet.has(t.topic)).length;
  const total = topics.length || sub.topicCount || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const avgScore = average(attempts.map(a => a.score));
  const practiceSeconds = attempts.reduce((s, a) => s + (a.timeSpentSeconds || 0), 0);
  const topicsPractised = byTopic.size;
  const avgTries = topicsPractised ? Math.round((attempts.length / topicsPractised) * 10) / 10 : 0;

  const units = groupByUnit(topics);
  // Unit headers only help when units actually hold several topics.
  const showUnits = units.length > 1 && units.some(u => u.topics.length > 1);

  const stats = [
    { label: 'Topics done', value: `${done}/${total}` },
    { label: 'Avg score', value: avgScore != null ? `${avgScore}%` : '—', tone: avgScore != null ? scoreColor(avgScore, accent) : undefined },
    { label: 'Avg time / topic', value: topicsPractised && practiceSeconds ? formatDuration(practiceSeconds / topicsPractised) : '—' },
    { label: 'Avg tries / topic', value: topicsPractised ? String(avgTries) : '—' },
  ];

  const renderTopic = (t: PanelTopic, first = false) => (
    <TopicProgressRow
      key={t.topic}
      first={first}
      name={t.topic}
      summary={byTopic.get(t.topic) ?? EMPTY_SUMMARY}
      isDone={completedSet.has(t.topic)}
      expanded={openTopic === t.topic}
      onToggle={() => setOpenTopic(o => (o === t.topic ? null : t.topic))}
      accent={accent}
      colors={colors}
    />
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.cardDark, borderColor: accent + '55' }]}>
      <View style={styles.header}>
        <View style={[cardStyles.iconWrap, { backgroundColor: accent + '18' }]}>
          <Feather name={meta.icon as any} size={16} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textMain }]}>{sub.subject}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>Tap a practised topic to see each try and the mistakes</Text>
        </View>
        <View style={[cardStyles.pctPill, { borderColor: accent + '88', backgroundColor: accent + '14', marginRight: 8 }]}>
          <Text style={[cardStyles.pctText, { color: accent }]}>{pct}%</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Close subject details">
          <Feather name="x" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        {stats.map(s => (
          <View key={s.label} style={[styles.stat, { borderColor: colors.borderColor }, isMobile ? { width: '48%' } : { flex: 1 }]}>
            <Text style={[styles.statValue, { color: s.tone ?? colors.textMain }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {topics.length === 0 ? (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.serif, fontSize: 12 }}>Topic details loading…</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={[styles.meta, { color: colors.textMuted, marginTop: 0 }]}>Loading practice results…</Text>
            </View>
          )}
          {showUnits ? (
            <View style={styles.grid}>
              {units.map((u, ui) => {
                const unitDone = u.topics.filter(t => completedSet.has(t.topic)).length;
                const unitAvg = average(u.topics.map(t => byTopic.get(t.topic)?.bestScore).filter((x): x is number => x != null));
                return (
                  <View key={u.unit || ui} testID={`unit-${ui + 1}`} style={[styles.list, { borderColor: colors.borderColor }, isMobile ? styles.full : styles.half]}>
                    <View style={[styles.unitHead, { backgroundColor: accent + '0F' }]}>
                      <Text style={[styles.unitNo, { color: accent }]}>UNIT {ui + 1}</Text>
                      <Text style={[styles.unitTitle, { color: colors.textMain }]} numberOfLines={1}>{u.unit || 'Other topics'}</Text>
                      <Text style={[styles.unitMeta, { color: colors.textMuted }]}>{unitDone}/{u.topics.length} done</Text>
                      {unitAvg != null && (
                        <Text style={[styles.unitMeta, { color: scoreColor(unitAvg, accent) }]}>· avg {unitAvg}%</Text>
                      )}
                    </View>
                    {u.topics.map(t => renderTopic(t))}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.grid}>
              {topics.map(t => (
                <View key={t.topic} style={[styles.list, { borderColor: colors.borderColor }, isMobile ? styles.full : styles.half]}>
                  {renderTopic(t, true)}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:       { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title:      { fontFamily: fonts.serif, fontSize: 16, fontWeight: '800' },
  meta:       { fontFamily: fonts.serif, fontSize: 11, fontWeight: '600', marginTop: 2 },
  stats:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  stat:       { borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  statValue:  { fontFamily: fonts.serif, fontSize: 18, fontWeight: '800' },
  statLabel:  { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  list:       { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  // Two columns of units; cards keep their own height so a tall unit doesn't stretch its neighbour.
  grid:       { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', rowGap: 10 },
  half:       { width: '49.3%' },
  full:       { width: '100%' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  unitHead:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  unitNo:     { fontFamily: fonts.serif, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  unitTitle:  { fontFamily: fonts.serif, fontSize: 13, fontWeight: '800', flex: 1 },
  unitMeta:   { fontFamily: fonts.serif, fontSize: 11, fontWeight: '700' },
});
