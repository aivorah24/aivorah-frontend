import React, { useMemo, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { csvEscape, downloadCsv } from '../../../utils/spreadsheet';
import { makeStyles } from './styles';
import { useLlmStats } from './hooks/useLlmStats';
import { useLlmInsights } from './hooks/useLlmInsights';
import { AreaChart, AreaSpark, BarChart, Donut, Sparkline, type ChartInk } from './components/charts';
import { fmtCost, fmtInt, fmtCompact, fmtDay, fmtMs, fmtTime, delta } from './utils/format';
import type { LlmStats } from './types';

const RANGES = [7, 30, 90];
const DONUT_SLOTS = 3; // beyond three models, fold into "Other"

function insightText(d: LlmStats): string {
  const { summary, previous, byFeature, byModel, days } = d;
  if (!summary.totalCalls) {
    return d.lastCallAt
      ? `No AI calls in the last ${days} days — the most recent was ${fmtDay(d.lastCallAt.slice(0, 10))}.`
      : 'No AI calls logged in this window.';
  }
  const top = byFeature[0];
  const parts = [`${top.feature} made ${Math.round((top.calls / summary.totalCalls) * 100)}% of ${fmtInt(summary.totalCalls)} calls`];
  const t = delta(summary.totalTokens, previous.totalTokens);
  if (t.dir !== 'flat' && t.text !== 'new') parts.push(`tokens ${t.dir} ${t.text.replace(/^[+-]/, '')} vs the previous ${days} days`);
  if (byModel[0]) parts.push(`${byModel[0].model} handled most of it`);
  return `${parts.join('; ')}.`;
}

const initialOf = (model: string) => (model.split('/').pop() || model).trim().charAt(0).toUpperCase();

export default function LlmUsageScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const ink: ChartInk = { text: colors.textMain, muted: colors.textDim, grid: colors.borderColor, surface: colors.cardDark };
  const { days, setDays, data, loading, error, load } = useLlmStats();
  const { insights, loading: insightsLoading } = useLlmInsights(days);
  // Failed or rule-based insights fall back to the local summary silently.
  const aiInsight = insights?.source === 'ai' && insights.text ? insights.text : null;
  const scrollRef = useRef<ScrollView>(null);
  const tableY = useRef(0);

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const gold = colors.accentYellow;
  const sage = colors.primary || colors.accentGreen;
  const rose = colors.accentRed;
  const modelColor = (i: number) => [gold, sage, rose][i] ?? colors.textDim;
  // "Up" is good for usage, bad for cost and latency.
  const deltaColor = (dir: string, upIsGood: boolean) => (dir === 'flat' ? colors.textMuted : (dir === 'up') === upIsGood ? sage : rose);

  const s = data?.summary;
  const p = data?.previous;
  const byDay = data?.byDay || [];
  const models = data?.byModel || [];
  const useCost = (s?.totalCost || 0) > 0;

  const donutSlices = [
    ...models.slice(0, DONUT_SLOTS).map((m, i) => ({ label: m.model, value: useCost ? m.cost : m.calls, color: modelColor(i) })),
    ...(models.length > DONUT_SLOTS ? [{
      label: 'Other', color: colors.textDim,
      value: models.slice(DONUT_SLOTS).reduce((acc, m) => acc + (useCost ? m.cost : m.calls), 0),
    }] : []),
  ];
  const donutTotal = donutSlices.reduce((acc, x) => acc + x.value, 0);

  const kpis = s && p ? [
    { key: 'cost', icon: 'dollar-sign', label: 'Estimated cost', value: fmtCost(s.totalCost), d: delta(s.totalCost, p.totalCost), up: false, color: gold, values: byDay.map((x) => x.cost) },
    { key: 'tokens', icon: 'layers', label: 'Total tokens', value: fmtCompact(s.totalTokens), d: delta(s.totalTokens, p.totalTokens), up: true, color: sage, values: byDay.map((x) => x.tokens) },
    { key: 'calls', icon: 'activity', label: 'Total requests', value: fmtCompact(s.totalCalls), d: delta(s.totalCalls, p.totalCalls), up: true, color: sage, values: byDay.map((x) => x.calls) },
    { key: 'speed', icon: 'clock', label: 'Avg response', value: fmtMs(s.avgResponseMs), d: delta(s.avgResponseMs, p.avgResponseMs), up: false, color: rose, values: byDay.filter((x) => x.calls).map((x) => x.avgResponseMs) },
  ] : [];

  const costDelta = s && p ? delta(s.totalCost, p.totalCost) : null;
  const dayLabels = byDay.map((d) => fmtDay(d.date));

  function exportModels() {
    if (!data) return;
    const rows = [['Model', 'Provider', 'Tokens', 'Calls', 'Cost (USD)', 'Share %', 'Avg response ms', 'Helpful %'].join(',')];
    data.byModel.forEach((m) => rows.push([m.model, m.provider, m.tokens, m.calls, m.cost, Math.round((useCost ? m.costShare : m.callShare) * 100), m.avgResponseMs, m.helpfulPct ?? '']
      .map((v) => csvEscape(String(v))).join(',')));
    downloadCsv(`aivorah-llm-models-${data.range.from}_${data.range.to}.csv`, rows.join('\n'));
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="LLM Usage" subtitle="Monitor AI usage, cost and model activity." onMenuPress={() => navigation?.openDrawer?.()} />

        {loading && !data ? (
          <ActivityIndicator size="large" color={gold} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.emptyBox}>
            <Feather name="alert-circle" size={26} color={colors.textDim} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : data && s && p ? (
          <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.toolbar}>
              <Text style={styles.rangeText}>{fmtDay(data.range.from)} – {fmtDay(data.range.to)}</Text>
              {loading && <ActivityIndicator size="small" color={gold} />}
              <View style={styles.segment}>
                {RANGES.map((d) => (
                  <TouchableOpacity key={d} testID={`llm-days-${d}`} style={[styles.segBtn, days === d && styles.segBtnOn]} onPress={() => setDays(d)}>
                    <Text style={[styles.segText, days === d && styles.segTextOn]}>{d} days</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.kpiGrid}>
              {kpis.map((k) => (
                <View key={k.key} style={styles.kpiCard} testID={`llm-kpi-${k.key}`}>
                  <LinearGradient colors={[colors.cardDark, colors.cardDark, k.color + '24']} locations={[0, 0.35, 1]} style={StyleSheet_absolute} />
                  <View style={styles.kpiHead}>
                    <View style={[styles.kpiIcon, { backgroundColor: k.color + '24' }]}><Feather name={k.icon as any} size={16} color={k.color} /></View>
                    <View>
                      <Text style={styles.kpiLabel}>{k.label}</Text>
                      <Text style={styles.kpiValue}>{k.value}</Text>
                    </View>
                  </View>
                  <Text style={styles.kpiDelta}>
                    <Text style={{ fontWeight: '800', color: deltaColor(k.d.dir, k.up) }}>
                      {k.d.dir === 'up' ? '↗ ' : k.d.dir === 'down' ? '↘ ' : ''}{k.d.text}
                    </Text> vs previous period
                  </Text>
                  <View style={styles.kpiSpark}><AreaSpark values={k.values} color={k.color} /></View>
                </View>
              ))}
            </View>

            <View style={styles.insight} testID="llm-insight">
              <View style={styles.insightIcon}><Feather name="star" size={18} color={gold} /></View>
              <View style={{ flex: 1, minWidth: 240 }}>
                <View style={styles.insightHead}>
                  <Text style={styles.insightTitle}>Insights</Text>
                  <Text style={styles.insightTag} testID="llm-insight-tag">{aiInsight ? 'AI-GENERATED' : 'SUMMARY'}</Text>
                  {insightsLoading && <ActivityIndicator testID="llm-insight-loading" size="small" color={colors.textDim} />}
                </View>
                <Text style={styles.insightText}>{aiInsight || insightText(data)}</Text>
              </View>
              {s.totalCalls > 0 && (
                <TouchableOpacity testID="llm-insight-details" style={styles.ghostBtn} onPress={() => scrollRef.current?.scrollTo({ y: tableY.current, animated: true })}>
                  <Text style={styles.ghostBtnText}>View details →</Text>
                </TouchableOpacity>
              )}
            </View>

            {s.totalCalls === 0 ? (
              <View style={styles.card}><Text style={styles.emptyRowText}>No AI calls in this window.</Text></View>
            ) : (
              <>
                <View style={styles.grid}>
                  <View style={[styles.card, styles.cell]}>
                    <Text style={styles.cardTitle}>{useCost ? 'Spend over time' : 'Requests over time'}</Text>
                    <Text style={styles.cardSub}>{useCost ? 'Daily estimated cost' : 'AI calls per day'}</Text>
                    <Text style={styles.bigValue}>{useCost ? fmtCost(s.totalCost) : fmtInt(s.totalCalls)}</Text>
                    {costDelta && (
                      <Text style={styles.kpiDelta}>
                        <Text style={{ fontWeight: '800', color: deltaColor(useCost ? costDelta.dir : delta(s.totalCalls, p.totalCalls).dir, !useCost) }}>
                          {(() => { const d = useCost ? costDelta : delta(s.totalCalls, p.totalCalls); return `${d.dir === 'up' ? '↗ ' : d.dir === 'down' ? '↘ ' : ''}${d.text}`; })()}
                        </Text> vs previous period
                      </Text>
                    )}
                    <View style={{ marginTop: 12 }}>
                      <AreaChart points={byDay.map((d, i) => ({ label: dayLabels[i], value: useCost ? d.cost : d.calls }))} color={gold} ink={ink} format={useCost ? fmtCost : fmtCompact} testID="llm-area" />
                    </View>
                  </View>

                  <View style={[styles.card, styles.cell]}>
                    <Text style={styles.cardTitle}>{useCost ? 'Cost breakdown' : 'Requests by model'}</Text>
                    <Text style={styles.cardSub}>Share of {useCost ? 'total cost' : 'all calls'} by model</Text>
                    <View style={styles.donutRow}>
                      <Donut slices={donutSlices} ink={ink} size={170} thickness={19} centerTitle="Total" centerValue={useCost ? fmtCost(donutTotal) : fmtInt(donutTotal)} />
                      <View style={styles.legend}>
                        {donutSlices.map((sl) => (
                          <View key={sl.label} testID={`llm-legend-${sl.label}`}>
                            <Text style={styles.legendName} numberOfLines={1}><Text style={{ color: sl.color }}>● </Text>{sl.label}</Text>
                            <Text style={styles.legendValue}>
                              {useCost ? fmtCost(sl.value) : fmtInt(sl.value)} ({donutTotal ? Math.round((sl.value / donutTotal) * 100) : 0}%)
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.grid}>
                  <View style={[styles.card, styles.cell]}>
                    <Text style={styles.cardTitle}>Token usage</Text>
                    <Text style={styles.cardSub}>Total tokens per day</Text>
                    <View style={{ marginTop: 12 }}>
                      <BarChart points={byDay.map((d, i) => ({ label: dayLabels[i], value: d.tokens }))} color={sage} ink={ink} format={fmtCompact} testID="llm-bars" height={200} />
                    </View>
                  </View>

                  <View style={[styles.card, styles.cell]} testID="llm-quality">
                    <Text style={styles.cardTitle}>Quality & speed</Text>
                    <Text style={styles.cardSub}>Student feedback and response time by model</Text>
                    <View style={{ gap: 18, marginTop: 18 }}>
                      {models.slice(0, 5).map((m) => (
                        <View key={m.model} testID={`llm-quality-${m.model}`}>
                          <View style={styles.qualityHead}>
                            <Text style={styles.qualityName} numberOfLines={1}>{m.model}</Text>
                            <Text style={styles.qualityMeta}>
                              {fmtMs(m.avgResponseMs)} · {m.helpfulPct == null ? 'no ratings yet' : `${m.helpfulPct}% helpful`}
                            </Text>
                          </View>
                          <View style={styles.track}><View style={[styles.trackFill, { width: `${m.helpfulPct ?? 0}%`, backgroundColor: sage }]} /></View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.grid}>
                  <View style={[styles.card, styles.cellWide]} onLayout={(e) => { tableY.current = e.nativeEvent.layout.y; }}>
                    <View style={styles.cardHeadRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>Model usage & cost</Text>
                        <Text style={styles.cardSub}>Detail breakdown by model</Text>
                      </View>
                      {Platform.OS === 'web' && (
                        <TouchableOpacity testID="llm-export" style={styles.smallBtn} onPress={exportModels}>
                          <Feather name="download" size={13} color={colors.textMain} />
                          <Text style={styles.smallBtnText}>Export CSV</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ minWidth: 560, flexGrow: 1 }}>
                        <View style={styles.thRow}>
                          <Text style={[styles.th, { flex: 2 }]}>Model</Text>
                          {['Tokens', 'Calls', 'Cost', 'Share', 'Trend'].map((h) => <Text key={h} style={styles.th}>{h}</Text>)}
                        </View>
                        {models.map((m, i) => (
                          <View key={m.model} style={styles.tr} testID={`llm-model-row-${m.model}`}>
                            <View style={[styles.modelCell, { flex: 2 }]}>
                              <View style={[styles.modelAvatar, { backgroundColor: modelColor(i) }]}><Text style={styles.modelAvatarText}>{initialOf(m.model)}</Text></View>
                              <View style={{ flexShrink: 1 }}>
                                <Text style={styles.tdStrong} numberOfLines={1}>{m.model}</Text>
                                <Text style={styles.tdSub}>{m.provider}</Text>
                              </View>
                            </View>
                            <Text style={styles.td}>{fmtCompact(m.tokens)}</Text>
                            <Text style={styles.td}>{fmtCompact(m.calls)}</Text>
                            <Text style={[styles.td, { fontWeight: '800' }]}>{fmtCost(m.cost)}</Text>
                            <Text style={styles.td}>{Math.round((useCost ? m.costShare : m.callShare) * 100)}%</Text>
                            <View style={{ flex: 1 }}><Sparkline values={m.trend} color={modelColor(i)} width={70} height={26} /></View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={[styles.card, styles.cell]}>
                    <Text style={styles.cardTitle}>Recent activity</Text>
                    <View style={{ marginTop: 8 }}>
                      {data.recent.slice(0, 6).map((r, i) => (
                        <View key={`${r.created_at}-${i}`} style={styles.activityRow} testID={`llm-recent-${i}`}>
                          <Text style={styles.activityTime}>{fmtTime(r.created_at)}</Text>
                          <View style={{ flex: 1.6, minWidth: 0 }}>
                            <Text style={styles.tdStrong} numberOfLines={1}>{r.feature}</Text>
                            <Text style={styles.tdSub} numberOfLines={1}>{r.model}{r.route ? ` · ${r.route}` : ''}</Text>
                          </View>
                          <Text style={[styles.td, { color: colors.textMuted }]}>{fmtInt(r.total_tokens)} tok</Text>
                          <Text style={[styles.td, { fontWeight: '800', flex: 0.8 }]}>{fmtCost(r.cost)}</Text>
                          <Text style={[styles.dot, { color: r.feedback === 3 ? sage : r.feedback === 2 ? gold : r.feedback === 1 ? rose : 'transparent' }]}>●</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        ) : null}
      </View>
    </ScreenLayout>
  );
}

const StyleSheet_absolute = { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };
