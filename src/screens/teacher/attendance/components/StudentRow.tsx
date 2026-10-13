import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AttendanceStatus, RosterStudent } from '../../../../services/attendanceClient';
import { attendanceColor } from '../../../../theme/attendanceColors';

const BUTTONS: { status: AttendanceStatus; label: string; icon: any }[] = [
  { status: 'present', label: 'Present', icon: 'check' },
  { status: 'absent', label: 'Absent', icon: 'x' },
  { status: 'late', label: 'Late', icon: 'clock' },
];

export default function StudentRow({ student, last, onMark, styles, colors }: {
  student: RosterStudent;
  last: boolean;
  onMark: (id: string, status: AttendanceStatus) => void;
  styles: any;
  colors: any;
}) {
  const initials = student.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View
      testID={`attendance-row-${student.id}`}
      style={[styles.studentRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.borderColor }]}
    >
      <View style={styles.studentInfoCol}>
        <View style={styles.studentAvatar}><Text style={styles.studentAvatarText}>{initials}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.studentNameText}>{student.name}</Text>
          {!!student.email && <Text style={styles.studentEmailText}>{student.email}</Text>}
        </View>
      </View>
      <View style={styles.attendanceButtonsCol}>
        {BUTTONS.map((b) => {
          const on = student.status === b.status;
          const color = attendanceColor(colors, b.status);
          return (
            <TouchableOpacity
              key={b.status}
              testID={`attendance-status-${student.id}-${b.status}`}
              style={[styles.attendanceButton, on && { backgroundColor: `${color}22`, borderColor: color }]}
              onPress={() => onMark(student.id, b.status)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${b.label}: ${student.name}`}
              accessibilityState={{ selected: on }}
              aria-selected={on}
            >
              <Feather name={b.icon} size={13} color={on ? color : colors.textDim} />
              <Text style={[styles.attendanceBtnLabel, on && { color, fontWeight: '700' }]}>{b.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
