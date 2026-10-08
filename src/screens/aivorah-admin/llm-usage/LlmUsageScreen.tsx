import React, { useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { makeStyles } from './styles';
import { useLlmStats } from './hooks/useLlmStats';
import KpiCard from '../overview/components/KpiCard';

const DAY_OPTIONS = [1, 7, 30];

export default function LlmUsageScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { days, setDays, data, loading, error, load } = useLlmStats();

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const summary = data?.summary;

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Header title="LLM Usage" subtitle="AI calls, tokens and cost across the platform." onMenuPress={() => navigation?.openDrawer?.()} />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.accentYellow} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.emptyBox}>
            <Feather name="alert-circle" size={26} color={colors.textDim} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.daysTabs}>
              {DAY_OPTIONS.map((d) => (
                <TouchableOpacity key={d} testID={`llm-days-${d}`} style={[styles.dayTab, days === d && styles.dayTabActive]} onPress={() => setDays(d)}>
                  <Text style={[styles.dayTabText, days === d && styles.dayTabTextActive]}>Last {d}d</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>SUMMARY</Text>
            <View style={styles.kpiGrid}>
              <KpiCard icon="message-circle" color={colors.accentCyan} value={summary?.totalCalls ?? 0} label="Total Calls" colors={colors} styles={styles} />
              <KpiCard icon="hash" color={colors.accentYellow} value={(summary?.totalTokens ?? 0).toLocaleString()} label="Total Tokens" colors={colors} styles={styles} />
              <KpiCard icon="dollar-sign" color={colors.accentRed} value={`$${(summary?.totalCost ?? 0).toFixed(2)}`} label="Estimated Cost" colors={colors} styles={styles} />
              <KpiCard icon="clock" color="#a78bfa" value={`${summary?.avgResponseMs ?? 0}ms`} label="Avg Response Time" colors={colors} styles={styles} />
            </View>

            <Text style={styles.sectionTitle}>BY MODEL</Text>
            <View style={styles.table}>
              <Text style={styles.tableHeading}>Models</Text>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableHeaderCell}>MODEL</Text>
                <Text style={styles.tableHeaderCell}>PROVIDER</Text>
                <Text style={styles.tableHeaderCell}>CALLS</Text>
                <Text style={styles.tableHeaderCell}>TOKENS</Text>
                <Text style={styles.tableHeaderCell}>COST</Text>
              </View>
              {(data?.byModel || []).length === 0 ? (
                <Text style={styles.emptyRowText}>No AI calls in this window.</Text>
              ) : (
                (data?.byModel || []).map((m) => (
                  <View key={m.model} style={styles.tableRow} testID={`llm-model-row-${m.model}`}>
                    <Text style={[styles.tableCell, styles.tableCellStrong]}>{m.model}</Text>
                    <Text style={styles.tableCell}>{m.provider}</Text>
                    <Text style={styles.tableCell}>{m.calls}</Text>
                    <Text style={styles.tableCell}>{m.tokens.toLocaleString()}</Text>
                    <Text style={[styles.tableCell, { color: colors.accentCyan }]}>${m.cost.toFixed(4)}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionTitle}>FEEDBACK</Text>
            <View style={styles.table}>
              <Text style={styles.tableHeading}>Student Session Feedback</Text>
              {data?.feedback.total ? (
                <Text style={styles.tableCell}>
                  {data.feedback.total} ratings · avg {data.feedback.avg} · 😊 {data.feedback.counts['3'] ?? 0} · 😐 {data.feedback.counts['2'] ?? 0} · 😞 {data.feedback.counts['1'] ?? 0}
                </Text>
              ) : (
                <Text style={styles.emptyRowText}>No feedback recorded in this window.</Text>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}
