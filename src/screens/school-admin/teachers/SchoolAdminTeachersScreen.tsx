import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { useTeachersState } from './hooks/useTeachersState';
import TeachersTable from './components/TeachersTable';
import { TeacherRow } from './utils/teachersFormatters';

export default function SchoolAdminTeachersScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { items, loading, refreshing, error, load, refresh } = useTeachersState(user?.email);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onEdit = (t: TeacherRow) => {
    navigation?.navigate?.('SchoolAdminEditTeacher', { teacher: { id: t.id, name: t.name, email: t.email, teaches: t.teaches || [] } });
  };

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Teachers" subtitle={`${items.length} teacher${items.length === 1 ? '' : 's'} in your school`} onMenuPress={() => navigation?.openDrawer?.()} />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accentYellow} />}
        >
          <View style={styles.toolbar}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.importBtn} onPress={() => navigation?.navigate?.('SchoolAdminTeacherBulkImport')} accessibilityRole="button">
              <Feather name="upload" size={14} color={colors.textHeading} />
              <Text style={styles.importBtnText}>Import Teachers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation?.navigate?.('SchoolAdminAddTeacher')} accessibilityRole="button">
              <Feather name="user-plus" size={14} color="#0B0B0B" />
              <Text style={styles.addBtnText}>Add Teacher</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.emptyBox}>
              <Feather name="alert-circle" size={28} color={colors.textDim} />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="user" size={28} color={colors.textDim} />
              <Text style={styles.emptyText}>No teachers yet. Add your first teacher to get started.</Text>
            </View>
          ) : (
            <TeachersTable items={items} onEdit={onEdit} />
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, maxWidth: 1080, width: '100%', alignSelf: 'center' },
    toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.lg },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingHorizontal: 14, height: 36 },
    addBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: '#0B0B0B' },
    importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingHorizontal: 14, height: 36 },
    importBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.textHeading },
    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 10, paddingHorizontal: 24 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  });
}
