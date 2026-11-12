/**
 * School Admin Console navigator — full shell matching the approved Claude
 * Design IA (grouped sidebar: Student Management / Academic Structure /
 * Student Lifecycle / People / Communication / Administration). Screens with
 * no backend yet (Promotions) route to SchoolAdminComingSoonScreen with
 * per-item copy rather than being faked or omitted from the nav.
 */
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../context/ThemeContext';

import DrawerContent from '../components/common/DrawerContent';
import SchoolAdminDashboardScreen from '../screens/school-admin/dashboard/SchoolAdminDashboardScreen';
import SchoolAdminComingSoonScreen from '@legacy/school-admin/SchoolAdminComingSoonScreen';
import { createLazyScreenGroup, useRoleWarmup } from './lazyScreens';
import { SCHOOL_ADMIN_SERVICES } from '../config/roleServices';

// Every screen below loads from its own chunk on first open (lazyScreens.tsx);
// SchoolAdminDashboardScreen stays in the main bundle so the home page needs no extra download.
const screens = createLazyScreenGroup();
const SchoolAdminPeopleScreen = screens.lazyScreen(() => import('../screens/school-admin/people/SchoolAdminPeopleScreen'));
const SchoolAdminStudentsScreen = screens.lazyScreen(() => import('../screens/school-admin/students/SchoolAdminStudentsScreen'));
const SchoolAdminTeachersScreen = screens.lazyScreen(() => import('../screens/school-admin/teachers/SchoolAdminTeachersScreen'));
const SchoolAdminParentsScreen = screens.lazyScreen(() => import('../screens/school-admin/parents/SchoolAdminParentsScreen'));
const SchoolAdminAddParentScreen = screens.lazyScreen(() => import('../screens/school-admin/parents/SchoolAdminAddParentScreen'));
const SchoolAdminSettingsScreen = screens.lazyScreen(() => import('../screens/school-admin/workspace-settings/SchoolAdminSettingsScreen'));
const SchoolAdminImportHistoryScreen = screens.lazyScreen(() => import('../screens/school-admin/import-history/SchoolAdminImportHistoryScreen'));
const SchoolAdminBulkImportScreen = screens.lazyScreen(() => import('../screens/school-admin/bulk-import/SchoolAdminBulkImportScreen'));
const SchoolAdminAddStudentScreen = screens.lazyScreen(() => import('../screens/school-admin/students/SchoolAdminAddStudentScreen'));
const SchoolAdminGradesSectionsScreen = screens.lazyScreen(() => import('../screens/school-admin/grades-sections/SchoolAdminGradesSectionsScreen'));
const SchoolAdminClassesScreen = screens.lazyScreen(() => import('../screens/school-admin/classes/SchoolAdminClassesScreen'));
const SchoolAdminAddTeacherScreen = screens.lazyScreen(() => import('../screens/school-admin/teachers/SchoolAdminAddTeacherScreen'));
const SchoolAdminEditTeacherScreen = screens.lazyScreen(() => import('../screens/school-admin/teachers/SchoolAdminEditTeacherScreen'));
const SchoolAdminTeacherBulkImportScreen = screens.lazyScreen(() => import('../screens/school-admin/bulk-import/SchoolAdminTeacherBulkImportScreen'));
const AnnouncementManagerScreen = screens.lazyScreen(() => import('../screens/shared/announcements/AnnouncementManagerScreen'));
const AnnouncementsScreen = screens.lazyScreen(() => import('../screens/shared/announcements/AnnouncementsScreen'));
const ChannelsScreen = screens.lazyScreen(() => import('../features/channels/components/ChannelsScreen'));
const TeacherSettingsScreen = screens.lazyScreen(() => import('../screens/teacher/settings/TeacherSettingsScreen'));
const SchoolAdminMessagesScreen = screens.lazyScreen(() => import('@legacy/school-admin/SchoolAdminMessagesScreen'));
const HelpSupportScreen = screens.lazyScreen(() => import('../screens/shared/help-support/HelpSupportScreen'));
const TimetableScreen = screens.lazyScreen(() => import('../screens/shared/timetable/TimetableScreen'));
const ResourcesScreen = screens.lazyScreen(() => import('../screens/shared/resources/ResourcesScreen'));

export type SchoolAdminDrawerParamList = {
  SchoolAdminDashboard: undefined;
  SchoolAdminPeople: { initialTab?: 'all' | 'student' | 'teacher' | 'parent' } | undefined;
  SchoolAdminStudents: { openAdd?: boolean; initialStatus?: 'all' | 'invited' | 'active' | 'inactive' | 'archived' } | undefined;
  SchoolAdminArchivedStudents: { initialStatus?: 'archived' } | undefined;
  SchoolAdminAddStudent: undefined;
  SchoolAdminTeachers: undefined;
  SchoolAdminAddTeacher: undefined;
  SchoolAdminEditTeacher: { teacher: { id: string; name: string; email: string; teaches?: { curriculum: string; grade: string; subjects: string[] }[] } };
  SchoolAdminTeacherBulkImport: undefined;
  SchoolAdminParents: undefined;
  SchoolAdminAddParent: undefined;
  SchoolAdminBulkImport: { title?: string; icon?: string; description?: string } | undefined;
  SchoolAdminGradesSections: { title?: string; icon?: string; description?: string } | undefined;
  SchoolAdminClasses: { title?: string; icon?: string; description?: string } | undefined;
  SchoolAdminPromotions: { title?: string; icon?: string; description?: string } | undefined;
  SchoolAdminImportHistory: { title?: string; icon?: string; description?: string } | undefined;
  AnnouncementManager: { openComposer?: boolean; statusTab?: 'all' | 'published' | 'scheduled' | 'draft' | 'archived' } | undefined;
  SchoolAdminAnnouncements: { openId?: string } | undefined;
  SchoolAdminSettings: undefined;
  TeacherSettings: undefined;
  TeacherHelp: undefined;
  Messages: undefined;
  Channels: undefined;
  Timetable: undefined;
  Resources: undefined;
};

const Drawer = createDrawerNavigator<SchoolAdminDrawerParamList>();

export default function SchoolAdminNavigator() {
  // Wake this role's services and, on a good connection, prefetch its screens.
  useRoleWarmup(screens, SCHOOL_ADMIN_SERVICES);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="SchoolAdminDashboard"
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
      <Drawer.Screen name="SchoolAdminDashboard" component={SchoolAdminDashboardScreen} />
      <Drawer.Screen name="SchoolAdminPeople" component={SchoolAdminPeopleScreen} />
      <Drawer.Screen name="SchoolAdminStudents" component={SchoolAdminStudentsScreen} />
      <Drawer.Screen name="SchoolAdminArchivedStudents" component={SchoolAdminStudentsScreen} initialParams={{ initialStatus: 'archived' }} />
      <Drawer.Screen name="SchoolAdminAddStudent" component={SchoolAdminAddStudentScreen} />
      <Drawer.Screen name="SchoolAdminTeachers" component={SchoolAdminTeachersScreen} />
      <Drawer.Screen name="SchoolAdminAddTeacher" component={SchoolAdminAddTeacherScreen} />
      <Drawer.Screen name="SchoolAdminEditTeacher" component={SchoolAdminEditTeacherScreen} />
      <Drawer.Screen name="SchoolAdminTeacherBulkImport" component={SchoolAdminTeacherBulkImportScreen} />
      <Drawer.Screen name="SchoolAdminParents" component={SchoolAdminParentsScreen} />
      <Drawer.Screen name="SchoolAdminAddParent" component={SchoolAdminAddParentScreen} />
      <Drawer.Screen
        name="SchoolAdminBulkImport"
        component={SchoolAdminBulkImportScreen}
      />
      <Drawer.Screen
        name="SchoolAdminGradesSections"
        component={SchoolAdminGradesSectionsScreen}
      />
      <Drawer.Screen name="SchoolAdminClasses" component={SchoolAdminClassesScreen} />
      <Drawer.Screen
        name="SchoolAdminPromotions"
        component={SchoolAdminComingSoonScreen}
        initialParams={{ title: 'Promotions', icon: 'trending-up', description: 'Move a graduating cohort to the next grade in one bulk action at year-end. Not built yet — grade changes today are one student at a time.' }}
      />
      <Drawer.Screen
        name="SchoolAdminImportHistory"
        component={SchoolAdminImportHistoryScreen}
      />
      <Drawer.Screen name="AnnouncementManager" component={AnnouncementManagerScreen} />
      <Drawer.Screen name="SchoolAdminAnnouncements" component={AnnouncementsScreen} />
      <Drawer.Screen name="SchoolAdminSettings" component={SchoolAdminSettingsScreen} />
      <Drawer.Screen name="TeacherSettings" component={TeacherSettingsScreen} />
      <Drawer.Screen name="TeacherHelp" component={HelpSupportScreen} />
      <Drawer.Screen name="Channels" component={ChannelsScreen} />
      <Drawer.Screen name="Messages" component={SchoolAdminMessagesScreen} />
      <Drawer.Screen name="Timetable" component={TimetableScreen} />
      <Drawer.Screen name="Resources" component={ResourcesScreen} />
    </Drawer.Navigator>
  );
}
