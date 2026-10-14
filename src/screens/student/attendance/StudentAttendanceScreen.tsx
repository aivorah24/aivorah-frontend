import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';
import { useTheme } from '../../../context/ThemeContext';
import { useStudentData } from '../../../context/StudentDataContext';
import { makeStyles } from './styles';
import { useStudentAttendance } from './hooks/useStudentAttendance';
import { attendanceTone } from '../../../theme/attendanceColors';
import { todayISO } from '../../teacher/attendance/utils/attendanceUtils';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STATUS_META: Record<string, { icon: any; note: string }> = {
  present: { icon: 'check-circle', note: 'Arrived on time for homeroom check-in' },
  absent: { icon: 'x-circle', note: 'No check-in recorded for the school day.' },
  late: { icon: 'clock', note: 'Late arrival recorded. Checked-in after homeroom.' },
};

export function formatDateLabel(dateStr: string) {
  const p = dateStr.split('-');
  if (p.length !== 3) return dateStr;
  return `${p[2]} ${MONTHS[parseInt(p[1], 10) - 1]?.slice(0, 3) ?? ''} ${p[0]}`;
}

export default function StudentAttendanceScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tone = (st: string) => attendanceTone(colors, st);
  const today = todayISO();

  const { studentId } = useStudentData();
  const { summary, loading, error } = useStudentAttendance(studentId);

  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const changeMonth = (delta: number) => {
    const m = month + delta;
    setMonth((m + 12) % 12);
    if (m < 0) setYear((y) => y - 1);
    if (m > 11) setYear((y) => y + 1);
  };

  const counts = summary?.summary;
  const hasRecords = !!counts && counts.total > 0 && counts.ratePct !== null;
  const history = useMemo(() => [...(summary?.history || [])].sort((a, b) => b.date.localeCompare(a.date)), [summary]);
  const statusByDate = useMemo(() => Object.fromEntries(history.map((h) => [h.date, h.status])), [history]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const cells: (string | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_v, i) => `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ];

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <Header
          title="My Attendance"
          subtitle="See how often you've checked in on time"
          onMenuPress={() => navigation.openDrawer()}
          onNotificationPress={() => navigation.navigate('Announcements')}
        />

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={colors.accentYellow} />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {!!error && (
              <View testID="attendance-error" style={styles.noRecordsBanner}>
                <Feather name="alert-circle" size={14} color={colors.accentRed} style={{ marginRight: 6 }} />
                <Text style={styles.noRecordsText}>{error}</Text>
              </View>
            )}
            <View style={[styles.layoutRow, isWide && styles.layoutRowWide]}>
              <View style={[styles.leftColumn, isWide && styles.leftColumnWide]}>
                <View style={styles.overallRateCard}>
                  <View style={[styles.statIconBadge, { backgroundColor: colors.accentYellowGlow, width: 40, height: 40, borderRadius: 20 }]}>
                    <Feather name="award" size={18} color={colors.accentYellow} />
                  </View>
                  <View testID="attendance-rate">
                    <Text style={styles.overallRateText}>{hasRecords ? `${counts!.ratePct}%` : 'No attendance recorded yet'}</Text>
                    {hasRecords && <Text style={styles.overallRateLabel}>Overall Attendance</Text>}
                  </View>
                </View>

                <View style={styles.statsCardsGrid}>
                  {(['present', 'absent', 'late'] as const).map((k) => {
                    const t = tone(k);
                    return (
                      <View key={k} testID={`attendance-card-${k}`} style={[styles.statCard, { borderLeftColor: t.fg, backgroundColor: t.bg, borderColor: t.border }]}>
                        <View style={styles.statCardHeaderRow}>
                          <Text testID={`attendance-count-${k}`} style={[styles.statValue, { color: t.fg }]}>{counts?.[k] ?? 0}</Text>
                        </View>
                        <Text style={[styles.statLabel, { color: t.fg }]}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                      </View>
                    );
                  })}
                </View>

                {!hasRecords && (
                  <View style={styles.noRecordsBanner}>
                    <Feather name="alert-circle" size={14} color={colors.accentYellow} style={{ marginRight: 6 }} />
                    <Text style={styles.noRecordsText}>Your teacher hasn&apos;t marked attendance yet.</Text>
                  </View>
                )}
              </View>

              <View style={[styles.rightColumn, isWide && styles.rightColumnWide]}>
                <View style={styles.recordsSection}>
                  <Text style={styles.recordsTitle}>All records</Text>
                  <View style={styles.calendarCard}>
                    <View style={styles.calendarHeaderRow}>
                      <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navArrowBtn} accessibilityLabel="Previous month">
                        <Feather name="chevron-left" size={18} color={colors.textMain} />
                      </TouchableOpacity>
                      <Text style={styles.calendarMonthTitle}>{MONTHS[month]} {year}</Text>
                      <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navArrowBtn} accessibilityLabel="Next month">
                        <Feather name="chevron-right" size={18} color={colors.textMain} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.calendarWeekdaysRow}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => <Text key={w} style={styles.calendarWeekdayText}>{w}</Text>)}
                    </View>
                    <View style={styles.calendarGrid}>
                      {cells.map((d, i) => {
                        const st = d ? statusByDate[d] : null;
                        const isToday = d === today;
                        return (
                          <View key={i} style={styles.calendarDayCell}>
                            {d && (
                              <>
                                <Text style={[styles.calendarDayText, (!!st || isToday) && { fontWeight: '700' }, !!st && { color: tone(st).fg }]}>{parseInt(d.slice(8), 10)}</Text>
                                {/* Status dot; today keeps the gold underline. */}
                                <View testID={st ? `attendance-day-dot-${d}` : undefined} style={[styles.calendarDayDot, { backgroundColor: st ? tone(st).fg : 'transparent' }]} />
                                <View testID={isToday ? 'attendance-day-today' : undefined} style={[styles.calendarDayUnderline, { backgroundColor: isToday ? colors.accentYellow : 'transparent' }]} />
                              </>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.activityLogsContainer}>
                    <Text style={styles.activityLogsTitle}>Detailed Logs</Text>
                    {history.length > 0 ? (
                      <View style={styles.logList}>
                        {history.map((log) => {
                          const st = { ...(STATUS_META[log.status] || STATUS_META.present), ...tone(log.status) };
                          return (
                            <View key={log.date} testID={`attendance-history-row-${log.date}`} style={styles.logItem}>
                              <View style={styles.logItemMain}>
                                <View style={styles.logItemTopRow}>
                                  <View style={styles.logItemLeft}>
                                    <Feather name={st.icon} size={15} color={st.fg} />
                                    <Text style={styles.logItemDate}>{formatDateLabel(log.date)}</Text>
                                  </View>
                                  <View testID={`attendance-badge-${log.date}`} style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                                    <Text style={[styles.statusBadgeText, { color: st.fg }]}>{log.status.charAt(0).toUpperCase() + log.status.slice(1)}</Text>
                                  </View>
                                </View>
                                <Text style={styles.logItemComment}>{st.note}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.emptyLogsCard}>
                        <Feather name="info" size={16} color={colors.textMuted} style={{ marginBottom: 4 }} />
                        <Text style={styles.emptyLogsText}>No attendance recorded yet.</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}
