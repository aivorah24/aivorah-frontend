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
import { useParentsState } from './hooks/useParentsState';
import ParentsTable from './components/ParentsTable';
import ParentDetailModal from './components/ParentDetailModal';

export default function SchoolAdminParentsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { items, loading, refreshing, error, selectedParent, setSelectedParent, load, refresh } = useParentsState(user?.email);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Parents" subtitle={`${items.length} parent${items.length === 1 ? '' : 's'} in your school`} onMenuPress={() => navigation?.openDrawer?.()} />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accentYellow} />}
        >
          <View style={styles.toolbar}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation?.navigate?.('SchoolAdminAddParent')} accessibilityRole="button">
              <Feather name="user-plus" size={14} color="#0B0B0B" />
              <Text style={styles.addBtnText}>Add Parent</Text>
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
              <Feather name="heart" size={28} color={colors.textDim} />
              <Text style={styles.emptyText}>No parents yet. Add your first parent to get started.</Text>
            </View>
          ) : (
            <ParentsTable items={items} onSelect={setSelectedParent} />
          )}
        </ScrollView>

        <ParentDetailModal parent={selectedParent} onClose={() => setSelectedParent(null)} />
      </View>
    </ScreenLayout>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, maxWidth: 1080, width: '100%', alignSelf: 'center' },
    toolbar: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingHorizontal: 14, height: 36 },
    addBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: '#0B0B0B' },
    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 10, paddingHorizontal: 24 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  });
}
