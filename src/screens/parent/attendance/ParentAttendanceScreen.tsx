import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import IndependentAccountEmpty from '../../../features/classes/components/IndependentAccountEmpty';
import { makeStyles } from './styles';
import { useParentAttendance } from './hooks/useParentAttendance';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STATUS_STYLE: Record<string, { bg: string; fg: string; icon: any; note: string }> = {
  present: { bg: '#e6fcf5', fg: '#0ca678', icon: 'check-circle', note: 'Arrived on time for homeroom check-in' },
  absent: { bg: '#fff5f5', fg: '#f03e3e', icon: 'x-circle', note: 'No check-in recorded for the school day.' },
  late: { bg: '#ba905a12', fg: '#ba905a', icon: 'clock', note: 'Late arrival recorded. Student checked-in post homeroom.' },
};

export function formatDateLabel(dateStr: string) {
  const p = dateStr.split('-');
  if (p.length !== 3) return dateStr;
  return `${p[2]} ${MONTHS[parseInt(p[1], 10) - 1]?.slice(0, 3) ?? ''} ${p[0]}`;
}

export default function ParentAttendanceScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // B2C / independent parent: no school link — show the connect bridge.
  const isB2C = !user?.schoolId;

  const { children, selectedChild, selectChild, loadingChildren, summary, loadingSummary, error } =
    useParentAttendance(user?.email || '', !isB2C, route?.params?.childId);

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

  const header = (
    <Header
      title="Attendance Portal"
      subtitle="Track your children's attendance history"
      onMenuPress={() => navigation.openDrawer()}
      onNotificationPress={() => navigation.navigate('ParentMessages')}
    />
  );

  if (isB2C) {
    return (
      <ScreenLayout>
        <View style={styles.container}>
          {header}
          <IndependentAccountEmpty feature="attendance" />
        </View>
      </ScreenLayout>
    );
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const cells: (string | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_v, i) => `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ];

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {header}

        {!loadingChildren && children.length > 0 && (
          <View style={styles.childTabsContainer}>
            {children.map((ch) => {
              const isSelected = selectedChild?.id === ch.id;
              return (
                <TouchableOpacity
                  key={ch.id}
                  testID={`attendance-child-${ch.id}`}
                  style={[styles.childTab, isSelected && styles.childTabSelected]}
                  onPress={() => selectChild(ch.id)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={[styles.childAvatar, { backgroundColor: isSelected ? colors.accentYellow : colors.borderColor }]}>
                    <Text style={[styles.childAvatarText, isSelected && { color: '#0B0B0B' }]}>{ch.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={[styles.childName, isSelected && styles.childTextSelected]}>{ch.name}</Text>
                    <Text style={styles.childSubText}>{ch.grade}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {loadingChildren || loadingSummary ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={colors.accentYellow} />
          </View>
        ) : !selectedChild ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{error || 'No child profile associated with this account.'}</Text>
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
                  <View style={[styles.statIconBadge, { backgroundColor: '#ba905a15', width: 40, height: 40, borderRadius: 20 }]}>
                    <Feather name="award" size={18} color="#ba905a" />
                  </View>
                  <View testID="attendance-rate">
                    <Text style={styles.overallRateText}>{hasRecords ? `${counts!.ratePct}%` : 'No attendance recorded yet'}</Text>
                    {hasRecords && <Text style={styles.overallRateLabel}>Overall Attendance</Text>}
                  </View>
                </View>

                <View style={styles.statsCardsGrid}>
                  {(['present', 'absent', 'late'] as const).map((k) => (
                    <View key={k} style={[styles.statCard, { borderLeftColor: STATUS_STYLE[k].fg, backgroundColor: STATUS_STYLE[k].bg }]}>
                      <View style={styles.statCardHeaderRow}>
                        <Text testID={`attendance-count-${k}`} style={[styles.statValue, { color: STATUS_STYLE[k].fg }]}>{counts?.[k] ?? 0}</Text>
                      </View>
                      <Text style={[styles.statLabel, { color: STATUS_STYLE[k].fg }]}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                    </View>
                  ))}
                </View>

                {!hasRecords && (
                  <View style={styles.noRecordsBanner}>
                    <Feather name="alert-circle" size={14} color={colors.accentYellow} style={{ marginRight: 6 }} />
                    <Text style={styles.noRecordsText}>Attendance is not yet updated by the school.</Text>
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
                        return (
                          <View key={i} style={styles.calendarDayCell}>
                            {d && (
                              <>
                                <Text style={[styles.calendarDayText, !!st && { fontWeight: '700' }]}>{parseInt(d.slice(8), 10)}</Text>
                                <View style={[styles.calendarDayUnderline, { backgroundColor: st ? STATUS_STYLE[st].fg : 'transparent' }]} />
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
                          const st = STATUS_STYLE[log.status] || STATUS_STYLE.present;
                          return (
                            <View key={log.date} testID={`attendance-history-row-${log.date}`} style={styles.logItem}>
                              <View style={styles.logItemMain}>
                                <View style={styles.logItemTopRow}>
                                  <View style={styles.logItemLeft}>
                                    <Feather name={st.icon} size={15} color={st.fg} />
                                    <Text style={styles.logItemDate}>{formatDateLabel(log.date)}</Text>
                                  </View>
                                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                                    <Text style={[styles.statusBadgeText, { color: st.fg }]}>{log.status.charAt(0).toUpperCase() + log.status.slice(1)}</Text>
                                  </View>
                                </View>
                                <Text style={styles.logItemComment}>{st.note}</Text>
                                {log.status !== 'present' && (
                                  <View style={styles.logActionButtons}>
                                    <TouchableOpacity style={styles.logActionBtn} onPress={() => navigation.navigate('ParentMessages')} activeOpacity={0.8}>
                                      <Feather name="message-square" size={11} color={colors.accentYellow} style={{ marginRight: 4 }} />
                                      <Text style={styles.logActionBtnText}>Message Teacher</Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
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
