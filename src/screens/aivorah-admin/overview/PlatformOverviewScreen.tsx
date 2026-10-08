import React, { useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { makeStyles } from './styles';
import { usePlatformOverview } from './hooks/usePlatformOverview';
import KpiCard from './components/KpiCard';

export default function PlatformOverviewScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    data, loading, error, load,
    b2bStudents, b2cStudents, schoolCount, b2bSharePct, schoolDrilldown,
  } = usePlatformOverview();

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const counts = data?.counts;

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Header title="Platform Overview" subtitle="Registered accounts and school-by-school activity, platform-wide." onMenuPress={() => navigation?.openDrawer?.()} />
          </View>
          <TouchableOpacity testID="overview-refresh-button" style={styles.refreshBtn} onPress={() => load()} activeOpacity={0.8}>
            <Feather name="refresh-cw" size={14} color={colors.textMain} />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
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
            <Text style={styles.sectionTitle}>PLATFORM OVERVIEW</Text>
            <View style={styles.kpiGrid}>
              <KpiCard icon="users" color={colors.accentCyan} value={counts?.users ?? 0} label="Total Users · Registered accounts" colors={colors} styles={styles} />
              <KpiCard icon="book-open" color={colors.accentYellow} value={counts?.students ?? 0} label="Students · Active learners" colors={colors} styles={styles} />
              <KpiCard icon="monitor" color={colors.accentRed} value={counts?.teachers ?? 0} label="Teachers · Educators onboard" colors={colors} styles={styles} />
              <KpiCard icon="heart" color="#a78bfa" value={counts?.parents ?? 0} label="Parents · Family engaged" colors={colors} styles={styles} />
              <KpiCard icon="star" color={colors.accentYellow} value={(counts?.totalXP ?? 0).toLocaleString()} label="Total XP Earned · Across all students" colors={colors} styles={styles} />
              <KpiCard icon="file-text" color={colors.accentCyan} value={counts?.assignments ?? 0} label={`Assignments · ${counts?.assignmentsCompleted ?? 0} completed`} colors={colors} styles={styles} />
            </View>

            <Text style={styles.sectionTitle}>B2B VS B2C SPLIT</Text>
            <View style={styles.kpiGrid}>
              <KpiCard icon="briefcase" color={colors.accentCyan} value={b2bStudents.length} label="B2B Students · School-enrolled" colors={colors} styles={styles} />
              <KpiCard icon="heart" color={colors.accentRed} value={b2cStudents.length} label="B2C Students · Parent-enrolled (direct)" colors={colors} styles={styles} />
              <KpiCard icon="monitor" color={colors.accentYellow} value={schoolCount} label="Schools · Institutions onboard" colors={colors} styles={styles} />
              <KpiCard icon="bar-chart-2" color="#a78bfa" value={`${b2bSharePct}%`} label="B2B Share · Of total students" colors={colors} styles={styles} />
            </View>

            <Text style={styles.sectionTitle}>SCHOOL DRILL-DOWN</Text>
            <View style={styles.table}>
              <Text style={styles.tableHeading}>Schools ({schoolDrilldown.length})</Text>
              <Text style={styles.tableSubheading}>Students and teachers per institution</Text>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>SCHOOL</Text>
                <Text style={styles.tableHeaderCell}>STUDENTS</Text>
                <Text style={styles.tableHeaderCell}>TEACHERS</Text>
                <Text style={styles.tableHeaderCell}>AVG XP / STUDENT</Text>
                <Text style={styles.tableHeaderCell}>TOTAL XP</Text>
              </View>
              {schoolDrilldown.length === 0 ? (
                <Text style={styles.emptyRowText}>No B2B schools yet.</Text>
              ) : (
                schoolDrilldown.map((row) => (
                  <View key={row.school} style={styles.tableRow} testID={`overview-school-row-${row.school}`}>
                    <Text style={[styles.tableCell, styles.tableCellSchool, { flex: 2 }]}>{row.school}</Text>
                    <Text style={styles.tableCell}>{row.students}</Text>
                    <Text style={styles.tableCell}>{row.teachers}</Text>
                    <Text style={[styles.tableCell, { color: colors.accentCyan }]}>{row.avgXP.toLocaleString()}</Text>
                    <Text style={styles.tableCell}>{row.totalXP.toLocaleString()}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}
