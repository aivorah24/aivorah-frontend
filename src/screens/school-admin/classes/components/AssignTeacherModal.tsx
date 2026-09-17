import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { ClassRow, TeacherOption } from '../services/schoolAdminClassesService';

interface AssignTeacherModalProps {
  colors: AppColors;
  pickerFor: ClassRow | null;
  pickerSearch: string;
  onSearchChange: (v: string) => void;
  pickerBusy: boolean;
  pickerError: string;
  pickerTeachers: TeacherOption[];
  onClose: () => void;
  onAssign: (teacherEmail: string | null) => void;
}

export function AssignTeacherModal({
  colors, pickerFor, pickerSearch, onSearchChange, pickerBusy, pickerError, pickerTeachers, onClose, onAssign,
}: AssignTeacherModalProps) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={!!pickerFor} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.pickerTitle}>Assign Class Teacher</Text>
              <Text style={styles.pickerSub}>{pickerFor?.grade} · Section {pickerFor?.section}</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={18} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerSearchBar}>
            <Feather name="search" size={14} color={colors.textDim} />
            <TextInput
              style={styles.pickerSearchInput} value={pickerSearch} onChangeText={onSearchChange}
              placeholder="Search teachers by name or email..." placeholderTextColor={colors.textDim}
            />
          </View>

          {pickerFor?.classTeacherEmail && (
            <TouchableOpacity style={styles.unassignRow} onPress={() => onAssign(null)} disabled={pickerBusy} accessibilityRole="button">
              <Feather name="user-x" size={14} color={colors.accentRed || '#F87171'} />
              <Text style={styles.unassignText}>Remove current class teacher</Text>
            </TouchableOpacity>
          )}

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {pickerTeachers.length === 0 ? (
              <Text style={styles.pickerEmpty}>No teachers match your search.</Text>
            ) : (
              pickerTeachers.map((t) => {
                const teachesThisGrade = (t.teaches || []).some((e) => e.grade === pickerFor?.grade);
                const isCurrent = t.email === pickerFor?.classTeacherEmail;
                return (
                  <TouchableOpacity
                    key={t.id} style={[styles.teacherRow, isCurrent && styles.teacherRowActive]}
                    onPress={() => onAssign(t.email)} disabled={pickerBusy} accessibilityRole="button"
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.teacherName} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.teacherEmail} numberOfLines={1}>{t.email}</Text>
                    </View>
                    {teachesThisGrade && <View style={styles.teachesTag}><Text style={styles.teachesTagText}>Teaches {pickerFor?.grade}</Text></View>}
                    {isCurrent && <Feather name="check" size={16} color={colors.accentYellow} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {pickerBusy && <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 10 }} />}
          {!!pickerError && <Text style={styles.pickerErr}>{pickerError}</Text>}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    pickerCard: { backgroundColor: colors.cardDark, borderRadius: 18, borderWidth: 1, borderColor: colors.borderColor, padding: 22, width: '100%', maxWidth: 460 },
    pickerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
    pickerTitle: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: colors.textHeading },
    pickerSub: { fontFamily: fonts.serif, fontSize: 12, color: colors.textDim, marginTop: 2 },
    pickerSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
    pickerSearchInput: { flex: 1, fontFamily: fonts.serif, fontSize: 13, color: colors.textMain },
    unassignRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 4, marginBottom: 6 },
    unassignText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600', color: colors.accentRed || '#F87171' },
    pickerEmpty: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textDim, textAlign: 'center', paddingVertical: 20 },
    teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: radius.sm },
    teacherRowActive: { backgroundColor: `${colors.accentYellow}14` },
    teacherName: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: colors.textHeading },
    teacherEmail: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim, marginTop: 1 },
    teachesTag: { backgroundColor: `${colors.accentYellow}18`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    teachesTagText: { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700', color: colors.accentYellow },
    pickerErr: { fontFamily: fonts.serif, fontSize: 12, color: colors.accentRed, marginTop: 8 },
  });
}
