import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AttendanceHistoryModal({
  visible, childName, attendanceSummary, calendarYear, calendarMonth,
  onChangeMonth, onClose, colors, s,
}: {
  visible: boolean; childName: string; attendanceSummary: any;
  calendarYear: number; calendarMonth: number;
  onChangeMonth: (year: number, month: number) => void;
  onClose: () => void; colors: AppColors; s: any;
}) {
  if (!visible || !attendanceSummary) return null;

  const goPrev = () => {
    let newMonth = calendarMonth - 1;
    let newYear = calendarYear;
    if (newMonth < 0) { newMonth = 11; newYear -= 1; }
    onChangeMonth(newYear, newMonth);
  };
  const goNext = () => {
    let newMonth = calendarMonth + 1;
    let newYear = calendarYear;
    if (newMonth > 11) { newMonth = 0; newYear += 1; }
    onChangeMonth(newYear, newMonth);
  };

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const days: { dayNum: number | null; dateString: string | null }[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ dayNum: null, dateString: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(calendarMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateString = `${calendarYear}-${monthStr}-${dayStr}`;
    days.push({ dayNum: d, dateString });
  }

  const historyMap: Record<string, string> = {};
  (attendanceSummary.history || []).forEach((h: any) => {
    historyMap[h.date] = h.status;
  });

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.calendarModalCard}>
          <View style={s.calendarModalHeader}>
            <Text style={s.calendarModalTitle}>{childName}&apos;s Attendance</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button">
              <Feather name="x" size={18} color={colors.textHeading} />
            </TouchableOpacity>
          </View>

          <View style={s.calendarModalBody}>
            <View style={s.calendarContainer}>
              <View style={s.calendarHeader}>
                <TouchableOpacity onPress={goPrev} style={s.calendarHeaderNavBtn}>
                  <Feather name="chevron-left" size={16} color={colors.textMain} />
                </TouchableOpacity>
                <Text style={s.calendarHeaderTitle}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>
                <TouchableOpacity onPress={goNext} style={s.calendarHeaderNavBtn}>
                  <Feather name="chevron-right" size={16} color={colors.textMain} />
                </TouchableOpacity>
              </View>

              <View style={s.calendarWeekdaysRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd) => (
                  <Text key={wd} style={s.calendarWeekdayText}>{wd}</Text>
                ))}
              </View>

              <View style={s.calendarGrid}>
                {days.map((item, idx) => {
                  const status = item.dateString ? historyMap[item.dateString] : null;
                  const isToday = item.dateString !== null && item.dateString === new Date().toISOString().split('T')[0];

                  let statusBgStyle: any = null;
                  let statusTextStyle: any = null;
                  if (status === 'present') {
                    statusBgStyle = { backgroundColor: '#10b981' };
                    statusTextStyle = { color: '#fff', fontWeight: '700' };
                  } else if (status === 'absent') {
                    statusBgStyle = { backgroundColor: colors.accentRed };
                    statusTextStyle = { color: '#fff', fontWeight: '700' };
                  } else if (status === 'late') {
                    statusBgStyle = { backgroundColor: '#f59e0b' };
                    statusTextStyle = { color: '#fff', fontWeight: '700' };
                  }

                  return (
                    <View
                      key={idx}
                      style={[
                        s.calendarDayCell,
                        statusBgStyle,
                        isToday && !status && { borderWidth: 1.5, borderColor: colors.accentYellow }
                      ]}
                    >
                      {item.dayNum !== null ? (
                        <Text
                          style={[
                            s.calendarDayText,
                            statusTextStyle,
                            isToday && !status && { color: colors.accentYellow, fontWeight: '700' }
                          ]}
                        >
                          {item.dayNum}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.legendColor, { backgroundColor: '#10b981' }]} />
                <Text style={s.legendText}>Present</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendColor, { backgroundColor: colors.accentRed }]} />
                <Text style={s.legendText}>Absent</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendColor, { backgroundColor: '#f59e0b' }]} />
                <Text style={s.legendText}>Late</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
