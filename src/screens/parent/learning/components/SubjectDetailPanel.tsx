import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { subjectMeta } from '../constants';
import { cardStyles } from './SubjectCard';
import TopicRow from './TopicRow';
import type { ChildReport } from '../types';

export default function SubjectDetailPanel({
  sub, completedSet, analyticsReport, colors, onClose, isMobile,
}: {
  sub: any;
  completedSet: Set<string>;
  analyticsReport: ChildReport | null;
  colors: AppColors;
  onClose: () => void;
  isMobile: boolean;
}) {
  const meta = subjectMeta(sub.subject);
  const accent = meta.accentDark;
  const topics: any[] = sub.topics ?? [];
  const done = topics.filter((t: any) => {
    const name = typeof t === 'string' ? t : t.topic;
    return completedSet.has(name) || [...completedSet].some(c => c.includes(name));
  }).length;
  const pct = sub.topicCount > 0 ? Math.round((done / sub.topicCount) * 100) : 0;
  const chapterCount = sub.chapterCount ?? 0;
  const unitCount    = sub.unitCount ?? new Set(topics.map((t: any) => (typeof t === 'string' ? '' : t.unit)).filter(Boolean)).size;
  const countLabel =
    chapterCount > 0 ? `${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'}`
    : unitCount > 0  ? `${unitCount} ${unitCount === 1 ? 'unit' : 'units'}`
    : sub.topicCount > 0 && sub.topicCount <= 40 ? `${sub.topicCount} topics`
    : '';

  return (
    <View style={[styles.card, { backgroundColor: colors.cardDark, borderColor: accent + '55' }]}>
      <View style={styles.header}>
        <View style={[cardStyles.iconWrap, { backgroundColor: accent + '18' }]}>
          <Feather name={meta.icon as any} size={16} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textMain }]}>{sub.subject}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>{countLabel ? `${countLabel} · ` : ''}{done} completed</Text>
        </View>
        <View style={[cardStyles.pctPill, { borderColor: accent + '88', backgroundColor: accent + '14', marginRight: 8 }]}>
          <Text style={[cardStyles.pctText, { color: accent }]}>{pct}%</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {topics.length === 0 ? (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.serif, fontSize: 12 }}>Topic details loading…</Text>
        </View>
      ) : (
        <View style={[styles.list, { borderColor: colors.borderColor, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' }]}>
          {topics.map((t: any, i: number) => {
            const topicName = typeof t === 'string' ? t : t.topic;
            const ta = analyticsReport?.topics[topicName];
            const isDone = completedSet.has(topicName) || [...completedSet].some(c => c.includes(topicName));
            const leftCol = !isMobile && i % 2 === 0;
            return (
              <View
                key={topicName || i}
                style={{
                  width: isMobile ? '100%' : '50%',
                  borderBottomWidth: 1, borderBottomColor: colors.borderColor,
                  ...(leftCol ? { borderRightWidth: 1, borderRightColor: colors.borderColor } : {}),
                }}
              >
                <TopicRow topic={t} analytics={ta} isDone={isDone} accent={accent} colors={colors} isLast />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:   { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title:  { fontFamily: fonts.serif, fontSize: 16, fontWeight: '800' },
  meta:   { fontFamily: fonts.serif, fontSize: 11, fontWeight: '600', marginTop: 2 },
  list:   { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
});
