import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { TeacherDrawerParamList } from './types';
import { useTheme } from '../context/ThemeContext';

import DrawerContent from '../components/common/DrawerContent';
import TeacherDashboardScreen from '../screens/teacher/dashboard/TeacherDashboardScreen';
import TeacherStudentsScreen from '../screens/teacher/students/TeacherStudentsScreen';
import TeacherScheduleScreen from '../screens/teacher/schedule/TeacherScheduleScreen';
import TeacherAttendanceScreen from '../screens/teacher/attendance/TeacherAttendanceScreen';
import TeacherAssignmentsScreen from '../screens/teacher/assignments/TeacherAssignmentsScreen';
import TeacherChallengesScreen from '../screens/teacher/challenges/TeacherChallengesScreen';
// Bug tracker / Student Progress work-order (2026-08-29): the legacy screen
// was a dummy — hardcoded "Alice Smith"/"Bob Jones", zero real backend call.
// Replaced with the real screen, backed by the extracted heatmap route in
// aivorah-teacher-dashboard-service.
import TeacherProgressScreen from '../screens/teacher/student-progress/TeacherStudentProgressScreen';
import AnnouncementsScreen from '../screens/shared/announcements/AnnouncementsScreen';
import TeacherLearningPathsScreen from '../screens/teacher/learning-paths/TeacherLearningPathsScreen';
import TeacherCurriculumLearningPathScreen from '../screens/teacher/curriculum-learning-path/TeacherCurriculumLearningPathScreen';
import TeacherLearningPathsManageScreen from '../screens/teacher/curriculum-learning-path/TeacherLearningPathsManageScreen';
import TeacherSubjectEditorScreen from '../screens/teacher/subject-paths/TeacherSubjectEditorScreen';
import TeacherSettingsScreen from '../screens/teacher/settings/TeacherSettingsScreen';
import TeacherMessagesScreen from '@legacy/teacher-legacy/TeacherMessagesScreen';
import AnnouncementManagerScreen from '../screens/shared/announcements/AnnouncementManagerScreen';
import MyClassesScreen from '../features/classes/components/MyClassesScreen';
import ClassDetailScreen from '../features/classes/components/ClassDetailScreen';
import TimetableScreen from '../screens/shared/timetable/TimetableScreen';
import ResourcesScreen from '../screens/shared/resources/ResourcesScreen';
import ChannelsScreen from '../features/channels/components/ChannelsScreen';
import HelpSupportScreen from '../screens/shared/help-support/HelpSupportScreen';

const Drawer = createDrawerNavigator<TeacherDrawerParamList>();

export default function TeacherNavigator() {
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
      <Drawer.Screen name="TeacherAnnouncements" component={AnnouncementsScreen} />
      <Drawer.Screen name="TeacherLearningPaths" component={TeacherLearningPathsScreen} />
      <Drawer.Screen name="TeacherCurriculumLearningPath" component={TeacherCurriculumLearningPathScreen} />
      <Drawer.Screen name="TeacherClassLearningPaths" component={TeacherLearningPathsManageScreen} />
      <Drawer.Screen name="TeacherSubjectEditor" component={TeacherSubjectEditorScreen} />
      <Drawer.Screen name="TeacherSettings" component={TeacherSettingsScreen} />
      <Drawer.Screen name="TeacherHelp" component={HelpSupportScreen} />
      <Drawer.Screen name="TeacherMessages" component={TeacherMessagesScreen} />
      <Drawer.Screen name="AnnouncementManager" component={AnnouncementManagerScreen} />
      <Drawer.Screen name="MyClasses" component={MyClassesScreen} />
      <Drawer.Screen name="ClassDetail" component={ClassDetailScreen} />
      <Drawer.Screen name="Timetable" component={TimetableScreen} />
      <Drawer.Screen name="Resources" component={ResourcesScreen} />
      <Drawer.Screen name="Channels" component={ChannelsScreen} />
    </Drawer.Navigator>
  );
}
