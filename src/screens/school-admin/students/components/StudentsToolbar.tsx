import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface StudentsToolbarProps {
  query: string;
  onQueryChange: (v: string) => void;
  onImport: () => void;
  onAddStudent: () => void;
  colors: AppColors;
}

export function StudentsToolbar({ query, onQueryChange, onImport, onAddStudent, colors }: StudentsToolbarProps) {
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.toolbar}>
      <View style={styles.searchBox}>
        <Feather name="search" size={14} color={colors.textDim} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search by name or admission no"
          placeholderTextColor={colors.textDim}
          style={styles.searchInput}
          accessibilityLabel="Search students"
        />
      </View>
      <TouchableOpacity
        style={styles.importBtn}
        onPress={onImport}
        accessibilityRole="button"
      >
        <Feather name="upload" size={14} color={colors.textHeading} />
        <Text style={styles.importBtnText}>Import Students</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.addBtn} onPress={onAddStudent} accessibilityRole="button">
        <Feather name="user-plus" size={14} color="#0B0B0B" />
        <Text style={styles.addBtnText}>Add Student</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, maxWidth: 360,
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.sm, paddingHorizontal: 10, height: 36,
    },
    searchInput: { flex: 1, fontFamily: fonts.serif, fontSize: 13, color: colors.textMain, height: '100%' },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.accentYellow, borderRadius: radius.sm,
      paddingHorizontal: 14, height: 36,
    },
    addBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: '#0B0B0B' },
    importBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.sm, paddingHorizontal: 14, height: 36,
    },
    importBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.textHeading },
  });
}
