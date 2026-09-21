import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { spacing, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';

import { useSchoolAdminDashboardData } from './hooks/useSchoolAdminDashboardData';
import DashboardStatsBar from './components/DashboardStatsBar';
import ManageList from './components/ManageList';
import AccessRequestRail from './components/AccessRequestRail';
import AccessRequestAuditModal from './components/AccessRequestAuditModal';
import { ManageRow, AccessRequest } from './types';

export default function SchoolAdminDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  
  const {
    overview,
    loading,
    refreshing,
    setRefreshing,
    error,
    accessRequests,
    actioningId,
    load,
    loadRequests,
    actionRequest,
  } = useSchoolAdminDashboardData(user?.email);

  const [selectedAuditRequest, setSelectedAuditRequest] = useState<AccessRequest | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      load();
      loadRequests();
    }, [load, loadRequests])
  );

  const activeAnnouncements = (overview?.counts.publishedAnnouncements ?? 0) + (overview?.counts.scheduledAnnouncements ?? 0);

  const manageRows: ManageRow[] = useMemo(() => [
    {
      key: 'students',
      icon: 'users',
      title: 'Students',
      caption: 'Search, filter, and manage every student record.',
      meta: overview ? `${overview.counts.students} students` : undefined,
      onPress: () => navigation.navigate('SchoolAdminStudents'),
    },
    {
      key: 'announcements',
      icon: 'volume-2',
      title: 'Announcements',
      caption: 'Create, schedule, and publish school communication.',
      meta: overview ? `${activeAnnouncements} active` : undefined,
      onPress: () => navigation.navigate('AnnouncementManager'),
    },
    {
      key: 'grades',
      icon: 'list',
      title: 'Grades & Sections',
      caption: "Configure your school's academic structure.",
      onPress: () => navigation.navigate('SchoolAdminGradesSections'),
    },
    {
      key: 'settings',
      icon: 'settings',
      title: 'Workspace Settings',
      caption: 'General information, branding, and access.',
      onPress: () => navigation.navigate('SchoolAdminSettings'),
    },
  ], [overview, activeAnnouncements, navigation]);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Overview"
          onMenuPress={() => navigation?.openDrawer?.()}
        />

        <View style={styles.crumbRow}>
          <Text style={styles.crumb}>School Workspace</Text>
          <Text style={styles.crumbSep}>/</Text>
          <Text style={styles.crumbSchool} numberOfLines={1}>{overview?.school?.name || '...'}</Text>
        </View>

        <ScrollView
          testID="dashboard-scroll"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accentYellow} />}
        >
          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.emptyBox}>
              <Feather name="alert-circle" size={28} color={colors.textDim} />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity onPress={() => { load(); }} style={styles.retryBtn} accessibilityRole="button">
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.greeting}>{overview?.school?.name || 'Your school'}</Text>
              <Text style={styles.greetingSub}>Manage your school workspace, people, communication, and settings.</Text>

              {overview && (
                <DashboardStatsBar
                  students={overview.counts.students}
                  teachers={overview.counts.teachers}
                  parents={overview.counts.parents}
                  activeAnnouncements={activeAnnouncements}
                  colors={colors}
                  isMobile={isMobile}
                />
              )}

              <View style={[styles.bodyRow, isMobile && styles.bodyRowMobile]}>
                <ManageList manageRows={manageRows} colors={colors} />

                <AccessRequestRail
                  accessRequests={accessRequests}
                  actioningId={actioningId}
                  onSelectRequest={setSelectedAuditRequest}
                  onActionRequest={(id, action) => actionRequest(id, action, () => {
                    if (selectedAuditRequest?.id === id) {
                      setSelectedAuditRequest(null);
                    }
                  })}
                  colors={colors}
                  isMobile={isMobile}
                />
              </View>
            </>
          )}
        </ScrollView>
      </View>

      <AccessRequestAuditModal
        selectedAuditRequest={selectedAuditRequest}
        onClose={() => setSelectedAuditRequest(null)}
        actioningId={actioningId}
        onActionRequest={(id, action) => actionRequest(id, action, () => {
          if (selectedAuditRequest?.id === id) {
            setSelectedAuditRequest(null);
          }
        })}
        colors={colors}
      />
    </ScreenLayout>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    crumbRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.borderColor,
    },
    crumb: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textDim },
    crumbSep: { fontFamily: fonts.serif, fontSize: 12, color: colors.textDim },
    crumbSchool: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.textHeading, flexShrink: 1 },

    content: { padding: spacing.xl, paddingBottom: 60, maxWidth: 1080, width: '100%', alignSelf: 'center' },

    greeting: { fontFamily: fonts.serif, fontSize: 21, fontWeight: '700', color: colors.textHeading },
    greetingSub: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, marginTop: 3 },

    bodyRow: { flexDirection: 'row', gap: 28 },
    bodyRowMobile: { flexDirection: 'column' },

    emptyBox: { alignItems: 'center', paddingTop: 56, gap: 10 },
    emptyText: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: colors.borderColor },
    retryText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
  });
}
