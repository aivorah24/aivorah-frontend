import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { useToast } from '../../../components/common/Toast';
import { useImportHistory } from './hooks/useImportHistory';
import ImportHistoryTable from './components/ImportHistoryTable';
import ImportResultsModal from './components/ImportResultsModal';

export default function SchoolAdminImportHistoryScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { ToastComponent } = useToast();
  const { runs, loading, error, selected, setSelected, retry } = useImportHistory(user?.email);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Import History"
          subtitle="Every bulk import, who ran it, and its results."
          onMenuPress={() => navigation?.openDrawer?.()}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Text style={styles.countText}>{runs.length} import{runs.length === 1 ? '' : 's'}</Text>
            <TouchableOpacity
              style={styles.newImportBtn}
              onPress={() => navigation?.navigate?.('SchoolAdminBulkImport')}
              accessibilityRole="button"
              accessibilityLabel="New Import"
            >
              <Feather name="upload" size={14} color="#0B0B0B" />
              <Text style={styles.newImportBtnText}>New Import</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.emptyBox}>
              <Feather name="alert-circle" size={26} color={colors.textDim} />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity onPress={retry} style={styles.retryBtn} accessibilityRole="button">
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : runs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="clock" size={26} color={colors.textDim} />
              <Text style={styles.emptyText}>No imports yet. Bulk-import a CSV of students or teachers and it&apos;ll show up here.</Text>
              <TouchableOpacity onPress={() => navigation?.navigate?.('SchoolAdminBulkImport')} style={styles.retryBtn} accessibilityRole="button">
                <Text style={styles.retryText}>Go to Bulk Import</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ImportHistoryTable colors={colors} runs={runs} userEmail={user?.email} onSelect={setSelected} />
          )}
        </ScrollView>
      </View>

      <ImportResultsModal colors={colors} selected={selected} userEmail={user?.email} onClose={() => setSelected(null)} />

      {ToastComponent}
    </ScreenLayout>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 1100, alignSelf: 'center' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, gap: 12 },
    countText: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textDim },
    newImportBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingHorizontal: 16, height: 38,
    },
    newImportBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: '#0B0B0B' },
    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 420 },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor },
    retryText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
  });
}
