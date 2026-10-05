import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../context/ThemeContext';

import DrawerContent from '../components/common/DrawerContent';
import TeacherDashboardScreen from '../screens/teacher/dashboard/TeacherDashboardScreen';
import TeacherStudentsScreen from '../screens/teacher/students/TeacherStudentsScreen';
import TeacherScheduleScreen from '../screens/teacher/schedule/TeacherScheduleScreen';
import TeacherAttendanceScreen from '../screens/teacher/attendance/TeacherAttendanceScreen';
import TeacherAssignmentsScreen from '../screens/teacher/assignments/TeacherAssignmentsScreen';
import TeacherChallengesScreen from '../screens/teacher/challenges/TeacherChallengesScreen';
import TeacherProgressScreen from '../screens/teacher/student-progress/TeacherStudentProgressScreen';
import TeacherSettingsScreen from '../screens/teacher/settings/TeacherSettingsScreen';
import TeacherMessagesScreen from '@legacy/teacher-legacy/TeacherMessagesScreen';
import AnnouncementManagerScreen from '../screens/shared/announcements/AnnouncementManagerScreen';
import TimetableScreen from '../screens/shared/timetable/TimetableScreen';
import ResourcesScreen from '../screens/shared/resources/ResourcesScreen';
import ChannelsScreen from '../features/channels/components/ChannelsScreen';

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
