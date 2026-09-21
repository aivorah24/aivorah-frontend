import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { GradeRow as GradeRowData } from '../types';

interface Props {
  grade: GradeRowData;
  isLast: boolean;
  colors: AppColors;
  onRename: () => void;
  onAddSection: () => void;
  onToggleArchive: () => void;
}

export default function GradeRow({ grade, isLast, colors, onRename, onAddSection, onToggleArchive }: Props) {
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.gradeRow, isLast && styles.gradeRowLast, grade.archived && styles.gradeRowArchived]}>
      <View style={styles.gradeNameCol}>
        <Text style={styles.gradeName}>{grade.name}</Text>
        {grade.archived && <View style={styles.archivedTag}><Text style={styles.archivedTagText}>Archived</Text></View>}
        <Text style={styles.gradeTotal}>{grade.totalStudents} student{grade.totalStudents === 1 ? '' : 's'}</Text>
      </View>

      <View style={styles.chipsCol}>
        {grade.sections.length === 0 && grade.unassignedCount === 0 ? (
          <Text style={styles.noSections}>No sections yet</Text>
        ) : (
          <>
            {grade.sections.map((sec) => (
              <View key={sec.name} style={[styles.chip, sec.archived && styles.chipArchived]}>
                <Text style={styles.chipText}>Section {sec.name}</Text>
                <Text style={styles.chipCount}>· {sec.studentCount} student{sec.studentCount === 1 ? '' : 's'}</Text>
              </View>
            ))}
            {grade.unassignedCount > 0 && (
              <View style={[styles.chip, styles.chipMuted]}>
                <Text style={styles.chipText}>No section</Text>
                <Text style={styles.chipCount}>· {grade.unassignedCount}</Text>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.actionsCol}>
        <TouchableOpacity onPress={onRename} accessibilityRole="button">
          <Text style={styles.actionLink}>Rename</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAddSection} accessibilityRole="button">
          <Text style={styles.actionLink}>Add section</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleArchive} accessibilityRole="button">
          <Text style={styles.actionLinkMuted}>{grade.archived ? 'Restore' : 'Archive'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    gradeRowLast: { borderBottomWidth: 0 },
    gradeRowArchived: { opacity: 0.6 },
    gradeNameCol: { width: 130, flexShrink: 0 },
    gradeName: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: colors.textHeading },
    gradeTotal: { fontFamily: fonts.serif, fontSize: 11, color: colors.textDim, marginTop: 3 },
    archivedTag: { alignSelf: 'flex-start', backgroundColor: `${colors.textDim}22`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, marginTop: 4 },
    archivedTagText: { fontFamily: fonts.serif, fontSize: 9.5, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },

    chipsCol: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, minWidth: 0 },
    noSections: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textDim, fontStyle: 'italic' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark,
      borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    },
    chipArchived: { opacity: 0.55, borderStyle: 'dashed' },
    chipMuted: { backgroundColor: 'transparent', borderStyle: 'dashed' },
    chipText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600', color: colors.textHeading },
    chipCount: { fontFamily: fonts.serif, fontSize: 12, color: colors.textMuted },

    actionsCol: { flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 0 },
    actionLink: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
    actionLinkMuted: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  });
}
