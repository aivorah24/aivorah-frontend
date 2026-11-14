import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { LoadState, Segment } from './ui';
import { shiftDate } from './QuizPanel';
import { getAnalytics } from '../services/currentAffairsAdminService';
import { useLoad } from '../hooks/useLoad';
import type { CaAnalytics, Metric } from '../types';
import type { CaStyles } from '../styles';

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];
const AGES = [
  { value: 'all', label: 'All ages' },
  { value: 'under-8', label: 'Under 8' },
  { value: '8-12', label: '8–12' },
  { value: '13+', label: '13+' },
];

type Key = keyof CaAnalytics['metrics'];
const CARDS: { key: Key; label: string; hint: string }[] = [
  { key: 'digestCompletionRate', label: 'Digest completion', hint: 'Of the days a student read a story, how often they finished the whole digest.' },
  { key: 'avgReadingSeconds', label: 'Time per story', hint: 'Average reading time of one story.' },
  { key: 'avgMinutesPerDay', label: 'Reading per day', hint: 'Average reading time per student on a reading day (target: about 5 minutes).' },
  { key: 'dailyActiveReaders', label: 'Daily readers', hint: 'Average number of students reading each day.' },
  { key: 'quizParticipation', label: 'Quiz participation', hint: 'Share of active students who played a weekly quiz.' },
  { key: 'quizAccuracy', label: 'Quiz accuracy', hint: 'Average weekly quiz score.' },
  { key: 'retention30', label: '30-day retention', hint: 'Students active in the 30 days before the last 30 days who were active again in the last 30.' },
  { key: 'avgStreak', label: 'Average streak', hint: 'Average current daily-reading streak of active students.' },
];

function show(m: Metric | undefined): string {
  if (!m || m.value === null || m.value === undefined) return '—';
  if (m.unit === '%') return `${m.value}%`;
  if (m.unit === 's') return `${m.value} s`;
  if (m.unit === 'min') return `${m.value} min`;
  if (m.unit === 'days') return `${m.value} days`;
  return String(m.value);
}

const today = () => new Date().toISOString().slice(0, 10);

/** The Current Affairs metrics for a date range and age group. */
export default function InsightsPanel({ styles, accent }: { styles: CaStyles; accent: string }) {
  const [days, setDays] = useState('30');
  const [age, setAge] = useState('all');
  const to = today();
  const from = shiftDate(to, -(Number(days) - 1));
  const fetchInsights = useCallback(() => getAnalytics(from, to, age), [from, to, age]);
  const { data, loading, error, reload } = useLoad(fetchInsights, 'Could not load the insights');

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarText}>{from} – {to}{data ? ` · ${data.activeStudents} active students` : ''}</Text>
        <Segment styles={styles} testID="ca-insights-age" options={AGES} value={age} onChange={setAge} />
        <Segment styles={styles} testID="ca-insights-days" options={RANGES} value={days} onChange={setDays} />
      </View>

      <LoadState styles={styles} loading={loading && !data} error={error} onRetry={reload} color={accent} />
      {data ? (
        <>
          <View style={styles.kpiGrid}>
            {CARDS.map((c) => (
              <View key={c.key} style={styles.kpiCard} testID={`ca-kpi-${c.key}`}>
                <Text style={styles.kpiLabel}>{c.label}</Text>
                <Text style={styles.kpiValue}>{show(data.metrics[c.key])}</Text>
                <Text style={styles.kpiHint}>{c.hint}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Day by day</Text>
            <Text style={styles.cardSub}>Students reading, stories read and digests finished each day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 480, flexGrow: 1 }}>
                <View style={styles.thRow}>
                  {['Date', 'Readers', 'Stories read', 'Digests finished'].map((h) => <Text key={h} style={styles.th}>{h}</Text>)}
                </View>
                {[...data.daily].reverse().map((d) => (
                  <View key={d.date} style={styles.tr} testID={`ca-day-${d.date}`}>
                    <Text style={styles.td}>{d.date}</Text>
                    <Text style={styles.td}>{d.readers}</Text>
                    <Text style={styles.td}>{d.storiesRead}</Text>
                    <Text style={styles.td}>{d.digestsCompleted}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  );
}
