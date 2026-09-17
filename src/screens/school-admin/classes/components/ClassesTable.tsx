import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { ClassRow } from '../services/schoolAdminClassesService';

interface ClassesTableProps {
  classes: ClassRow[];
  colors: AppColors;
  onAssign: (cls: ClassRow) => void;
}

export function ClassesTable({ classes, colors, onAssign }: ClassesTableProps) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.table}>
      <View style={styles.theadRow}>
        <View style={styles.colClass}><Text style={styles.thText}>Class</Text></View>
        <View style={styles.colTeacher}><Text style={styles.thText}>Class Teacher</Text></View>
        <View style={styles.colStudents}><Text style={styles.thText}>Students</Text></View>
        <View style={styles.colAction} />
      </View>
      {classes.map((c, i) => {
        const key = `${c.grade}::${c.section}`;
        return (
          <View key={key} style={[styles.tr, i === classes.length - 1 && styles.trLast]}>
            <View style={styles.colClass}><Text style={styles.tdStrong} numberOfLines={1}>{c.grade} · Section {c.section}</Text></View>
            <View style={styles.colTeacher}>
              {c.classTeacherName
                ? <Text style={styles.td} numberOfLines={1}>{c.classTeacherName}</Text>
                : <Text style={styles.tdUnassigned}>Unassigned</Text>}
            </View>
            <View style={styles.colStudents}><Text style={styles.td}>{c.studentCount} student{c.studentCount === 1 ? '' : 's'}</Text></View>
            <View style={styles.colAction}>
              <TouchableOpacity onPress={() => onAssign(c)} accessibilityRole="button">
                <Text style={styles.actionLink}>{c.classTeacherName ? 'Change teacher' : 'Assign teacher'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    table: { backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, overflow: 'hidden' },
    theadRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor, backgroundColor: colors.cardHover, paddingVertical: 10 },
    thText: { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: colors.textDim, paddingHorizontal: 14 },
    tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingVertical: 12 },
    trLast: { borderBottomWidth: 0 },
    colClass: { flex: 1.6, minWidth: 150, paddingHorizontal: 14 },
    colTeacher: { flex: 1.6, minWidth: 140, paddingHorizontal: 14 },
    colStudents: { flex: 1, minWidth: 100, paddingHorizontal: 14 },
    colAction: { width: 140, paddingHorizontal: 14, alignItems: 'flex-end' },
    td: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted },
    tdStrong: { fontFamily: fonts.serif, fontSize: 13.5, fontWeight: '700', color: colors.textHeading },
    tdUnassigned: { fontFamily: fonts.serif, fontSize: 12.5, fontStyle: 'italic', color: colors.textDim },
    actionLink: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
  });
}
