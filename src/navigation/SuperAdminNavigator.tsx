import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../context/ThemeContext';

import DrawerContent from '../components/common/DrawerContent';
import TeacherDashboardScreen from '../screens/teacher/dashboard/TeacherDashboardScreen';
import TEACHER_DASHBOARD_SERVER_URL from '../config/teacherDashboardServerUrl';
import STUDENTS_SERVER_URL from '../config/studentsServerUrl';
import CHALLENGES_SERVER_URL from '../config/challengesServerUrl';
import { createLazyScreenGroup, useRoleWarmup } from './lazyScreens';

// Every screen below loads from its own chunk on first open (lazyScreens.tsx);
// TeacherDashboardScreen stays in the main bundle so the home page needs no extra download.
const screens = createLazyScreenGroup();
const ROLE_SERVICES = [TEACHER_DASHBOARD_SERVER_URL, STUDENTS_SERVER_URL, CHALLENGES_SERVER_URL];
const TeacherStudentsScreen = screens.lazyScreen(() => import('../screens/teacher/students/TeacherStudentsScreen'));
const TeacherScheduleScreen = screens.lazyScreen(() => import('../screens/teacher/schedule/TeacherScheduleScreen'));
const TeacherAttendanceScreen = screens.lazyScreen(() => import('../screens/teacher/attendance/TeacherAttendanceScreen'));
const TeacherAssignmentsScreen = screens.lazyScreen(() => import('../screens/teacher/assignments/TeacherAssignmentsScreen'));
const TeacherChallengesScreen = screens.lazyScreen(() => import('../screens/teacher/challenges/TeacherChallengesScreen'));
const TeacherProgressScreen = screens.lazyScreen(() => import('../screens/teacher/student-progress/TeacherStudentProgressScreen'));
const TeacherSettingsScreen = screens.lazyScreen(() => import('../screens/teacher/settings/TeacherSettingsScreen'));
const TeacherMessagesScreen = screens.lazyScreen(() => import('@legacy/teacher-legacy/TeacherMessagesScreen'));
const AnnouncementManagerScreen = screens.lazyScreen(() => import('../screens/shared/announcements/AnnouncementManagerScreen'));
const TimetableScreen = screens.lazyScreen(() => import('../screens/shared/timetable/TimetableScreen'));
const ResourcesScreen = screens.lazyScreen(() => import('../screens/shared/resources/ResourcesScreen'));
const ChannelsScreen = screens.lazyScreen(() => import('../features/channels/components/ChannelsScreen'));

export type SuperAdminDrawerParamList = {
  TeacherDashboard: undefined;
  TeacherStudents: undefined;
  TeacherAssignments: undefined;
  TeacherChallenges: undefined;
  TeacherSchedule: undefined;
  TeacherAttendance: { grade?: string; section?: string; date?: string } | undefined;
  TeacherProgress: undefined;
  TeacherSettings: undefined;
  TeacherMessages: undefined;
  AnnouncementManager: undefined;
  Timetable: undefined;
  Resources: undefined;
  Channels: undefined;
};

const Drawer = createDrawerNavigator<SuperAdminDrawerParamList>();

export default function SuperAdminNavigator() {
  // Wake this role's services and, on a good connection, prefetch its screens.
  useRoleWarmup(screens, ROLE_SERVICES);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="TeacherDashboard"
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
      <Drawer.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
      <Drawer.Screen name="TeacherStudents" component={TeacherStudentsScreen} />
      <Drawer.Screen name="TeacherAssignments" component={TeacherAssignmentsScreen} />
      <Drawer.Screen name="TeacherChallenges" component={TeacherChallengesScreen} />
      <Drawer.Screen name="TeacherSchedule" component={TeacherScheduleScreen} />
      <Drawer.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
      <Drawer.Screen name="TeacherProgress" component={TeacherProgressScreen} />
      <Drawer.Screen name="TeacherSettings" component={TeacherSettingsScreen} />
      <Drawer.Screen name="TeacherMessages" component={TeacherMessagesScreen} />
      <Drawer.Screen name="AnnouncementManager" component={AnnouncementManagerScreen} />
      <Drawer.Screen name="Timetable" component={TimetableScreen} />
      <Drawer.Screen name="Resources" component={ResourcesScreen} />
      <Drawer.Screen name="Channels" component={ChannelsScreen} />
    </Drawer.Navigator>
  );
}
