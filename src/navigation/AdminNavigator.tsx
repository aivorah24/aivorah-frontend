/**
 * Aivorah Admin — its own persona/navigator, not embedded inside Student/
 * Teacher/Parent/School Admin/Super Admin. An allowed email (ADMIN_EMAILS,
 * same list the backend re-checks) always lands here regardless of their
 * underlying users.role — see App.tsx's role-routing.
 */
import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../context/ThemeContext';

import DrawerContent from '../components/common/DrawerContent';
import PlatformOverviewScreen from '../screens/aivorah-admin/overview/PlatformOverviewScreen';
import AdminUsersScreen from '../screens/aivorah-admin/users/AdminUsersScreen';
import MapToTeacherScreen from '../screens/aivorah-admin/map-to-teacher/MapToTeacherScreen';
import BulkImportScreen from '../screens/aivorah-admin/bulk-import/BulkImportScreen';
import LlmUsageScreen from '../screens/aivorah-admin/llm-usage/LlmUsageScreen';

export type AdminDrawerParamList = {
  PlatformOverview: undefined;
  AdminUsers: undefined;
  MapToTeacher: undefined;
  BulkImport: undefined;
  LlmUsage: undefined;
};

const Drawer = createDrawerNavigator<AdminDrawerParamList>();

// Refresh keeps the admin on the page in the URL (old /AdminUsers-style links too).
const ROUTE_BY_PATH: Record<string, keyof AdminDrawerParamList> = {
  'admin-users': 'AdminUsers', adminusers: 'AdminUsers',
  'admin-map-to-teacher': 'MapToTeacher', maptoteacher: 'MapToTeacher',
  'admin-bulk-import': 'BulkImport', bulkimport: 'BulkImport',
  'admin-llm-usage': 'LlmUsage', llmusage: 'LlmUsage',
};

export function adminRouteFromPath(path: string): keyof AdminDrawerParamList {
  const seg = String(path || '').split('?')[0].replace(/^\/+|\/+$/g, '').toLowerCase();
  return ROUTE_BY_PATH[seg] || 'PlatformOverview';
}

export default function AdminNavigator() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const { colors } = useTheme();
  const [initialRoute] = React.useState(() =>
    Platform.OS === 'web' && typeof window !== 'undefined' ? adminRouteFromPath(window.location.pathname) : 'PlatformOverview');

  return (
    <Drawer.Navigator
      initialRouteName={initialRoute}
      backBehavior="history"
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: isLargeScreen ? 'permanent' : 'slide',
        drawerStyle: isLargeScreen
          ? { width: 0, opacity: 0, pointerEvents: 'none' as const }
          : { width: 260, backgroundColor: colors.sidebarDark },
        overlayColor: 'rgba(0,0,0,0.5)',
        swipeEnabled: !isLargeScreen,
        sceneContainerStyle: { backgroundColor: colors.bgDark },
        animationEnabled: false,
      } as any}
    >
      <Drawer.Screen name="PlatformOverview" component={PlatformOverviewScreen} />
      <Drawer.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Drawer.Screen name="MapToTeacher" component={MapToTeacherScreen} />
      <Drawer.Screen name="BulkImport" component={BulkImportScreen} />
      <Drawer.Screen name="LlmUsage" component={LlmUsageScreen} />
    </Drawer.Navigator>
  );
}
