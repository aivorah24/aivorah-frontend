import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';
import type { AttendanceClass } from '../../../services/attendanceClient';
import { makeStyles } from './styles';
import { useAttendanceClasses } from './hooks/useAttendanceClasses';
import { useClassAttendance } from './hooks/useClassAttendance';
import { attendanceStats, isValidISODate, todayISO } from './utils/attendanceUtils';
import ClassChips from './components/ClassChips';
import StatsRow from './components/StatsRow';
import StudentRow from './components/StudentRow';

// Deep link: /teacher/attendance?grade=Grade%205&section=A&date=2026-09-15 opens that class directly.
export default function TeacherAttendanceScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = route?.params || {};
  const linked = useMemo<AttendanceClass | null>(
    () => (params.grade && params.section ? { grade: String(params.grade), section: String(params.section) } : null),
    [params.grade, params.section],
  );

  const { classes, loading: loadingClasses, error: classesError } = useAttendanceClasses();
  const [picked, setPicked] = useState<AttendanceClass | null>(null);
  const selected = picked ?? linked ?? classes[0] ?? null;

  const [dateText, setDateText] = useState<string>(params.date && isValidISODate(String(params.date)) ? String(params.date) : todayISO());
  const [date, setDate] = useState(dateText);
  const onDateChange = (v: string) => {
    setDateText(v);
    if (isValidISODate(v)) setDate(v);
  };

  const { students, loading, loadError, saving, message, mark, markAllPresent, save } = useClassAttendance(selected, date);
  const [search, setSearch] = useState('');
  const stats = useMemo(() => attendanceStats(students), [students]);
  const shown = useMemo(() => students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())), [students, search]);

  const noClasses = !loadingClasses && !classesError && classes.length === 0 && !linked;

  return (
    <ScreenLayout>
      <Header title="Attendance" subtitle="Mark daily student attendance records" onMenuPress={() => navigation?.openDrawer?.()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {loadingClasses ? (
          <ActivityIndicator size="large" color={colors.accentYellow} style={{ marginTop: 40 }} />
        ) : noClasses ? (
          <View testID="attendance-empty" style={styles.emptyContainer}>
            <Feather name="layers" size={32} color={colors.textDim} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No classes assigned</Text>
            <Text style={styles.emptyText}>Ask your school admin to make you the class teacher of a section.</Text>
          </View>
        ) : (
          <>
            <View style={styles.chipRow}>
              <ClassChips classes={classes} selected={selected} onSelect={setPicked} styles={styles} colors={colors} />
              <View style={styles.dateBox}>
                <Feather name="calendar" size={14} color={colors.accentYellow} />
                <TextInput
                  testID="attendance-date"
                  style={styles.dateInput}
                  value={dateText}
                  onChangeText={onDateChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textDim}
                  accessibilityLabel="Attendance date"
                  maxLength={10}
                />
              </View>
            </View>

            {(classesError || loadError) && (
              <View testID="attendance-error" style={styles.errorBox}>
                <Feather name="alert-circle" size={16} color={colors.accentRed} />
                <Text style={styles.errorText}>{loadError || classesError}</Text>
              </View>
            )}

            {!loadError && selected && (
              <>
                <StatsRow stats={stats} styles={styles} colors={colors} />

                <View style={styles.actionsBar}>
                  <View style={styles.searchContainer}>
                    <Feather name="search" size={16} color={colors.textDim} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search student..."
                      placeholderTextColor={colors.textDim}
                      value={search}
                      onChangeText={setSearch}
                    />
                  </View>
                  <TouchableOpacity style={styles.markAllBtn} onPress={markAllPresent} activeOpacity={0.8}>
                    <Feather name="check-square" size={14} color="#241f16" style={{ marginRight: 4 }} />
                    <Text style={styles.markAllBtnText}>Mark All Present</Text>
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <ActivityIndicator size="large" color={colors.accentYellow} style={{ marginTop: 40 }} />
                ) : shown.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Feather name="users" size={32} color={colors.textDim} style={{ marginBottom: 10 }} />
                    <Text style={styles.emptyText}>No students found in this class.</Text>
                  </View>
                ) : (
                  <View style={styles.studentsListCard}>
                    {shown.map((s, i) => (
                      <StudentRow key={s.id} student={s} last={i === shown.length - 1} onMark={mark} styles={styles} colors={colors} />
                    ))}
                  </View>
                )}

                {!loading && students.length > 0 && (
                  <TouchableOpacity testID="attendance-save" style={styles.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#241f16" />
                    ) : (
                      <>
                        <Feather name="save" size={16} color="#241f16" style={{ marginRight: 6 }} />
                        <Text style={styles.saveBtnText}>Save Daily Attendance</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {!!message && (
                  <Text
                    testID="attendance-save-message"
                    style={[styles.saveMessage, { color: message.kind === 'success' ? colors.accentGreen : colors.accentRed }]}
                  >
                    {message.text}
                  </Text>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
