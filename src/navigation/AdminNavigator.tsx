/**
 * Aivorah Admin — its own persona/navigator, not embedded inside Student/
 * Teacher/Parent/School Admin/Super Admin. An allowed email (ADMIN_EMAILS,
 * same list the backend re-checks) always lands here regardless of their
 * underlying users.role — see App.tsx's role-routing.
 */
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../context/ThemeContext';

import DrawerContent from '../components/common/DrawerContent';
import PlatformOverviewScreen from '../screens/aivorah-admin/overview/PlatformOverviewScreen';
import MapToTeacherScreen from '../screens/aivorah-admin/map-to-teacher/MapToTeacherScreen';
import BulkImportScreen from '../screens/aivorah-admin/bulk-import/BulkImportScreen';
import LlmUsageScreen from '../screens/aivorah-admin/llm-usage/LlmUsageScreen';

export type AdminDrawerParamList = {
  PlatformOverview: undefined;
  MapToTeacher: undefined;
  BulkImport: undefined;
  LlmUsage: undefined;
};

const Drawer = createDrawerNavigator<AdminDrawerParamList>();

export default function AdminNavigator() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="PlatformOverview"
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
      <Drawer.Screen name="MapToTeacher" component={MapToTeacherScreen} />
      <Drawer.Screen name="BulkImport" component={BulkImportScreen} />
      <Drawer.Screen name="LlmUsage" component={LlmUsageScreen} />
    </Drawer.Navigator>
  );
}
