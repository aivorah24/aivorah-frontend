import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Svg, { Circle } from 'react-native-svg';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Animated, useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useParentControlsData } from './hooks/useParentControlsData';
import { useChildSubjects } from './hooks/useChildSubjects';
import ControlRow from './components/ControlRow';
import PickerModal from './components/PickerModal';
import { TIME_OPTIONS, WEEKLY_OPTIONS, BREAK_INTERVALS, BREAK_DURATIONS, HOUR_OPTIONS } from './constants';
import { formatMinutes, formatHour } from './utils';
import type { PickerMode } from './types';

export default function ParentControlsScreen(_props: any) {
  const { width } = useWindowDimensions();
  const twoCol = width >= 1100;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const parentEmail = user?.email || '';

  // Animated.Value is designed to be read directly during render and passed
  // into a style prop (native-driven, doesn't trigger React re-renders) -
  // not a stale-ref bug the way a plain ref read during render would be.
  // eslint-disable-next-line react-hooks/refs
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const showToast = useCallback(() => {
    toastOpacity.setValue(1);
    toastAnimRef.current?.stop();
    toastAnimRef.current = Animated.sequence([
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);
    toastAnimRef.current.start();
  }, [toastOpacity]);

  useEffect(() => () => toastAnimRef.current?.stop(), []);

  const { children, selectedChild, setSelectedChild, loading, saving, ctrl, set, saveSettings, error } =
    useParentControlsData(parentEmail, showToast);

  const { subjects, loading: subjectsLoading, notice: subjectsNotice } = useChildSubjects(selectedChild);
  // Saved names not in this child's list stay stored (other curricula/old lists) but aren't shown or counted.
  const visibleBlocked = useMemo(
    () => ctrl.blockedSubjects.filter(sub => subjects.includes(sub)),
    [ctrl.blockedSubjects, subjects],
  );

  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  // Errors render inline: Alert.alert is a no-op on web.
  const onSave = () => { saveSettings(); };

  const toggleSubject = (subject: string) => {
    const blocked = ctrl.blockedSubjects.includes(subject)
      ? ctrl.blockedSubjects.filter(sub => sub !== subject)
      : [...ctrl.blockedSubjects, subject];
    set({ blockedSubjects: blocked });
  };

  const pickerData = useMemo(() => {
    switch (pickerMode) {
      case 'daily': return TIME_OPTIONS;
      case 'weekly': return WEEKLY_OPTIONS;
      case 'breakInterval': return BREAK_INTERVALS;
      case 'breakDuration': return BREAK_DURATIONS;
      case 'startHour': return HOUR_OPTIONS;
      case 'endHour': return HOUR_OPTIONS;
      default: return [];
    }
  }, [pickerMode]);

  const pickerValue = useMemo(() => {
    switch (pickerMode) {
      case 'daily': return ctrl.dailyLimitMinutes;
      case 'weekly': return ctrl.weeklyCapMinutes;
      case 'breakInterval': return ctrl.breakIntervalMinutes;
      case 'breakDuration': return ctrl.breakDurationMinutes;
      case 'startHour': return ctrl.allowedHoursStart;
      case 'endHour': return ctrl.allowedHoursEnd;
      default: return 0;
    }
  }, [pickerMode, ctrl]);

  const pickerTitle = pickerMode === 'daily' ? 'Daily Limit'
    : pickerMode === 'weekly' ? 'Weekly Cap'
    : pickerMode === 'breakInterval' ? 'Break Every'
    : pickerMode === 'breakDuration' ? 'Break Duration'
    : pickerMode === 'startHour' ? 'Start Time'
    : pickerMode === 'endHour' ? 'End Time' : '';

  const handlePickerSelect = (val: number) => {
    switch (pickerMode) {
      case 'daily': set({ dailyLimitMinutes: val }); break;
      case 'weekly': set({ weeklyCapMinutes: val }); break;
      case 'breakInterval': set({ breakIntervalMinutes: val }); break;
      case 'breakDuration': set({ breakDurationMinutes: val }); break;
      case 'startHour': set({ allowedHoursStart: val }); break;
      case 'endHour': set({ allowedHoursEnd: val }); break;
    }
    setPickerMode(null);
  };

  const formatPickerItem = (val: number) =>
    (pickerMode === 'startHour' || pickerMode === 'endHour') ? formatHour(val) : formatMinutes(val);

  if (loading && children.length === 0) {
    return (
      <ScreenLayout>
        <Header title="Parental Controls" subtitle="Manage your child's app usage" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accentYellow} />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <Header title="Parental Controls" subtitle="Manage your child's app usage" />
      <ScrollView style={s.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: twoCol ? 1040 : 640 }}>

          {children.length > 1 && (
            <View style={s.childRow}>
              {children.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.childChip, selectedChild?.id === c.id && { backgroundColor: colors.accentYellow + '20', borderColor: colors.accentYellow }]}
                  onPress={() => setSelectedChild(c)}
                  activeOpacity={0.7}
                >
                  <View style={[s.avatar, { backgroundColor: selectedChild?.id === c.id ? colors.accentYellow : colors.textDim + '30' }]}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontFamily: fonts.serif, fontSize: 13 }}>{(c.name || 'S')[0].toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: selectedChild?.id === c.id ? colors.accentYellow : colors.textMain, fontWeight: '600', fontFamily: fonts.serif, fontSize: 13 }}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedChild && (
            <>
              <View style={{ marginBottom: 10 }}>
                <Text style={s.sectionLabel}>USAGE OVERVIEW — {selectedChild.name.toUpperCase()}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <UsageRing
                    label="TODAY" used={ctrl.todayUsageMinutes} limit={ctrl.isEnabled ? ctrl.dailyLimitMinutes : 0}
                    emptyLabel="no limit" gradientColors={['#93B0AC12', '#C3DCD808']} colors={colors}
                  />
                  <UsageRing
                    label="THIS WEEK" used={ctrl.weeklyUsageMinutes} limit={ctrl.weeklyCapEnabled ? ctrl.weeklyCapMinutes : 0}
                    emptyLabel="no cap" gradientColors={['#C5BD9612', '#EEE8B408']} colors={colors}
                  />
                </View>
              </View>

              <Text style={s.sectionLabel}>SCREEN TIME</Text>
              <View style={[s.controlList, twoCol && s.grid]} testID="parental-controls-screen-time-grid">
                <View style={twoCol ? s.gridCell : undefined}>
                <ControlRow testID="parental-controls-daily-limit-switch" title="Daily Limit" icon="clock" iconBg="#93B0AC20" iconColor="#93B0AC"
                  enabled={ctrl.isEnabled} onToggle={v => set({ isEnabled: v })} colors={colors}>
                  <View style={s.fieldFull}>
                    <Text style={[s.fieldLabel, { color: colors.textDim, marginTop: 0 }]}>Limit</Text>
                    <TouchableOpacity style={[s.pickerBtn, { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '10' }]}
                      onPress={() => setPickerMode('daily')} activeOpacity={0.7}>
                      <Text style={{ color: colors.accentYellow, fontWeight: '700', fontFamily: fonts.serif, fontSize: 13, flex: 1 }}>{formatMinutes(ctrl.dailyLimitMinutes)}</Text>
                      <Feather name="chevron-down" size={13} color={colors.accentYellow} />
                    </TouchableOpacity>
                    <View style={[s.row, { marginTop: 10 }]}>
                      <Text style={{ color: colors.textDim, fontFamily: fonts.serif, fontSize: 12, flex: 1 }}>Lock app when limit is reached</Text>
                      <Switch value={ctrl.lockWhenReached} onValueChange={v => set({ lockWhenReached: v })}
                        trackColor={{ false: colors.textDim + '30', true: '#EFD1D450' }}
                        thumbColor={ctrl.lockWhenReached ? '#EFD1D4' : colors.textDim} />
                    </View>
                  </View>
                </ControlRow>
                </View>

                <View style={twoCol ? s.gridCell : undefined}>
                <ControlRow testID="parental-controls-weekly-cap-switch" title="Weekly Cap" icon="calendar" iconBg="#C5BD9620" iconColor="#C5BD96"
                  enabled={ctrl.weeklyCapEnabled} onToggle={v => set({ weeklyCapEnabled: v })} colors={colors}>
                  <View style={s.fieldFull}>
                    <Text style={[s.fieldLabel, { color: colors.textDim, marginTop: 0 }]}>Weekly limit</Text>
                    <TouchableOpacity style={[s.pickerBtn, { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '10' }]}
                      onPress={() => setPickerMode('weekly')} activeOpacity={0.7}>
                      <Text style={{ color: colors.accentYellow, fontWeight: '700', fontFamily: fonts.serif, fontSize: 13, flex: 1 }}>{formatMinutes(ctrl.weeklyCapMinutes)}</Text>
                      <Feather name="chevron-down" size={13} color={colors.accentYellow} />
                    </TouchableOpacity>
                  </View>
                </ControlRow>
                </View>

                <View style={twoCol ? s.gridCell : undefined}>
                <ControlRow testID="parental-controls-allowed-hours-switch" title="Allowed Hours" icon="sun" iconBg="#F0C27020" iconColor="#F0C270"
                  enabled={ctrl.allowedHoursEnabled} onToggle={v => set({ allowedHoursEnabled: v })} colors={colors}>
                  <View style={s.fieldRow}>
                    <View style={s.fieldHalf}>
                      <Text style={[s.fieldLabel, { color: colors.textDim, marginTop: 0 }]}>From</Text>
                      <TouchableOpacity style={[s.pickerBtn, { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '10' }]}
                        onPress={() => setPickerMode('startHour')} activeOpacity={0.7}>
                        <Text style={{ color: colors.accentYellow, fontWeight: '700', fontFamily: fonts.serif, fontSize: 13, flex: 1 }}>{formatHour(ctrl.allowedHoursStart)}</Text>
                        <Feather name="chevron-down" size={13} color={colors.accentYellow} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.fieldHalf}>
                      <Text style={[s.fieldLabel, { color: colors.textDim, marginTop: 0 }]}>To</Text>
                      <TouchableOpacity style={[s.pickerBtn, { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '10' }]}
                        onPress={() => setPickerMode('endHour')} activeOpacity={0.7}>
                        <Text style={{ color: colors.accentYellow, fontWeight: '700', fontFamily: fonts.serif, fontSize: 13, flex: 1 }}>{formatHour(ctrl.allowedHoursEnd)}</Text>
                        <Feather name="chevron-down" size={13} color={colors.accentYellow} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </ControlRow>
                </View>

                <View style={twoCol ? s.gridCell : undefined}>
                <ControlRow testID="parental-controls-break-enforcer-switch" title="Break Enforcer" icon="coffee" iconBg="#93B0AC20" iconColor="#93B0AC"
                  enabled={ctrl.breakEnforcerEnabled} onToggle={v => set({ breakEnforcerEnabled: v })} colors={colors}>
                  <View style={s.fieldRow}>
                    <View style={s.fieldHalf}>
                      <Text style={[s.fieldLabel, { color: colors.textDim, marginTop: 0 }]}>Break every</Text>
                      <TouchableOpacity style={[s.pickerBtn, { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '10' }]}
                        onPress={() => setPickerMode('breakInterval')} activeOpacity={0.7}>
                        <Text style={{ color: colors.accentYellow, fontWeight: '700', fontFamily: fonts.serif, fontSize: 13, flex: 1 }}>{formatMinutes(ctrl.breakIntervalMinutes)}</Text>
                        <Feather name="chevron-down" size={13} color={colors.accentYellow} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.fieldHalf}>
                      <Text style={[s.fieldLabel, { color: colors.textDim, marginTop: 0 }]}>Break lasts</Text>
                      <TouchableOpacity style={[s.pickerBtn, { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '10' }]}
                        onPress={() => setPickerMode('breakDuration')} activeOpacity={0.7}>
                        <Text style={{ color: colors.accentYellow, fontWeight: '700', fontFamily: fonts.serif, fontSize: 13, flex: 1 }}>{formatMinutes(ctrl.breakDurationMinutes)}</Text>
                        <Feather name="chevron-down" size={13} color={colors.accentYellow} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </ControlRow>
                </View>
              </View>

              <Text style={s.sectionLabel}>CONTENT</Text>
              <View style={s.controlList}>
                <ControlRow testID="parental-controls-subject-filter-switch" title="Subject Filter" subtitle="Blocked subjects are locked on the student's app" icon="filter" iconBg="#C5BD9620" iconColor="#C5BD96"
                  enabled={ctrl.subjectFilterEnabled} onToggle={v => set({ subjectFilterEnabled: v })} colors={colors}>
                  {subjectsLoading && <ActivityIndicator testID="parental-controls-subjects-loading" size="small" color={colors.accentYellow} />}
                  {subjectsNotice && <Text testID="parental-controls-subjects-notice" style={s.subjectNotice}>{subjectsNotice}</Text>}
                  <View style={s.subjectGrid}>
                    {subjects.map(subject => {
                      const blocked = ctrl.blockedSubjects.includes(subject);
                      return (
                        <TouchableOpacity
                          key={subject}
                          style={[s.subjectChip, {
                            backgroundColor: blocked ? '#EFD1D420' : colors.accentYellow + '15',
                            borderColor: blocked ? '#EFD1D480' : colors.accentYellow + '60',
                          }]}
                          onPress={() => toggleSubject(subject)}
                          activeOpacity={0.7}
                        >
                          <Feather name={blocked ? 'lock' : 'unlock'} size={11} color={blocked ? '#EFD1D4' : colors.accentYellow} />
                          <Text style={{ color: blocked ? '#EFD1D4' : colors.accentYellow, fontFamily: fonts.serif, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                            {subject}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {visibleBlocked.length > 0 && (
                    <Text style={{ color: '#EFD1D4', fontFamily: fonts.serif, fontSize: 11, marginTop: 10 }}>
                      {visibleBlocked.length} subject{visibleBlocked.length > 1 ? 's' : ''} blocked
                    </Text>
                  )}
                </ControlRow>
              </View>

              {error && (
                <View testID="parental-controls-error" style={s.errorBanner}>
                  <Feather name="alert-circle" size={15} color="#B3261E" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              <Animated.View style={[s.toast, { opacity: toastOpacity }]}>
                <Feather name="check-circle" size={15} color="#fff" />
                <Text style={{ color: '#fff', fontFamily: fonts.serif, fontSize: 13, fontWeight: '600' }}>Settings saved</Text>
              </Animated.View>

              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.accentYellow }]}
                onPress={onSave}
                activeOpacity={0.7}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#0B0B0B" />
                  : <><Feather name="check" size={15} color="#0B0B0B" /><Text style={{ color: '#0B0B0B', fontWeight: '700', fontFamily: fonts.serif, fontSize: 13 }}>Save All Settings</Text></>
                }
              </TouchableOpacity>
            </>
          )}

          {children.length === 0 && (
            <View style={{ alignItems: 'center', gap: 12, marginTop: 60 }}>
              <Feather name="users" size={40} color={colors.textDim} />
              <Text style={{ color: colors.textDim, fontFamily: fonts.serif, fontSize: 14, textAlign: 'center' }}>
                No children linked yet. Add a child from the dashboard to manage controls.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <PickerModal
        visible={!!pickerMode}
        title={pickerTitle}
        data={pickerData}
        value={pickerValue}
        formatItem={formatPickerItem}
        onSelect={handlePickerSelect}
        onClose={() => setPickerMode(null)}
        colors={colors}
      />
    </ScreenLayout>
  );
}

function UsageRing({
  label, used, limit, emptyLabel, gradientColors, colors,
}: {
  label: string; used: number; limit: number; emptyLabel: string;
  gradientColors: [string, string]; colors: AppColors;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? '#EFD1D4' : pct >= 70 ? '#C5BD96' : colors.accentYellow;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <LinearGradient colors={gradientColors} style={[styles.usageStrip, { borderColor: color + '30' }]}>
      <View style={{ width: 40, height: 40 }}>
        <Svg width="40" height="40" viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r={r} fill="none" stroke={color + '22'} strokeWidth="4" />
          <Circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 20 20)" />
        </Svg>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textDim, fontFamily: fonts.serif, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6 }}>{label}</Text>
        <Text style={{ color, fontWeight: '800', fontFamily: fonts.serif, fontSize: 14 }}>{formatMinutes(used)}</Text>
      </View>
      <Text style={{ color: colors.textDim, fontFamily: fonts.serif, fontSize: 11 }}>
        {limit > 0 ? `${pct}% of ${formatMinutes(limit)}` : emptyLabel}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  usageStrip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1 },
});

const makeStyles = (c: AppColors, _isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  sectionLabel: { color: c.textDim, fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  childRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginTop: 6 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, borderWidth: 1.5, marginBottom: 4 },
  subjectNotice: { color: c.textDim, fontFamily: fonts.serif, fontSize: 12, marginBottom: 4 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1, minWidth: '30%', justifyContent: 'center' },
  controlList: { gap: 6, marginBottom: 14 },
  // Two columns on wide screens; cells keep their own height (rows never stretch to a sibling).
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  gridCell: { flexBasis: '48%', flexGrow: 1 },
  fieldFull: { gap: 4 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldHalf: { flex: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 999, marginTop: 4, alignSelf: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#B3261E14', borderColor: '#B3261E55', borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  errorText: { flex: 1, color: '#B3261E', fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: c.accentYellow, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginBottom: 8 },
});
