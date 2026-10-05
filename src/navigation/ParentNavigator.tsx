import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { ParentDrawerParamList } from './types';
import { useTheme } from '../context/ThemeContext';

import DrawerContent from '../components/common/DrawerContent';
import DashboardScreen from '../screens/student/dashboard/DashboardScreen';
import ParentDashboardScreen from '../screens/parent/dashboard/ParentDashboardScreen';
import ParentProfileScreen from '../screens/parent/profile/ParentProfileScreen';
import ParentMyKidsScreen from '../screens/parent/my-kids/ParentMyKidsScreen';
import ParentDailyTasksScreen from '../screens/parent/daily-tasks/ParentDailyTasksScreen';
import ParentScheduleScreen from '@legacy/parent/ParentScheduleScreen';
import ParentAssignmentsScreen from '../screens/parent/assignments/ParentAssignmentsScreen';
import ParentChallengesScreen from '../screens/parent/challenges/ParentChallengesScreen';
import ParentLeaderboardScreen from '@legacy/parent/ParentLeaderboardScreen';
import ParentProgressScreen from '../screens/parent/progress/ParentProgressScreen';
import ParentAIProgressReportScreen from '../screens/parent/ai-progress-report/ParentAIProgressReportScreen';
import ParentSettingsScreen from '../screens/parent/settings/ParentSettingsScreen';
import ParentMessagesScreen from '@legacy/parent/ParentMessagesScreen';
import AnnouncementsScreen from '../screens/shared/announcements/AnnouncementsScreen';
import SubscriptionScreen from '@legacy/student-legacy/SubscriptionScreen';
import MyClassesScreen from '../features/classes/components/MyClassesScreen';
import ClassDetailScreen from '../features/classes/components/ClassDetailScreen';
import TimetableScreen from '../screens/shared/timetable/TimetableScreen';
import ResourcesScreen from '../screens/shared/resources/ResourcesScreen';
import ChannelsScreen from '../features/channels/components/ChannelsScreen';
import ParentAttendanceScreen from '../screens/parent/attendance/ParentAttendanceScreen';
import ParentControlsScreen from '../screens/parent/parental-controls/ParentControlsScreen';
import ParentLearningScreen from '../screens/parent/learning/ParentLearningScreen';
import ParentHelpScreen from '../screens/parent/help-center/ParentHelpScreen';

const Drawer = createDrawerNavigator<ParentDrawerParamList>();

export default function ParentNavigator() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="ParentDashboard"
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
      <Drawer.Screen name="ParentDashboard" component={ParentDashboardScreen} />
      <Drawer.Screen name="ParentStudentView" component={DashboardScreen} />
      <Drawer.Screen name="ParentProfile" component={ParentProfileScreen} />
      <Drawer.Screen name="ParentMyKids" component={ParentMyKidsScreen} />
      <Drawer.Screen name="ParentDailyTasks" component={ParentDailyTasksScreen} />
      <Drawer.Screen name="ParentSchedule" component={ParentScheduleScreen} />
      <Drawer.Screen name="ParentAssignments" component={ParentAssignmentsScreen} />
      <Drawer.Screen name="ParentChallenges" component={ParentChallengesScreen} />
      <Drawer.Screen name="ParentLeaderboard" component={ParentLeaderboardScreen} />
      <Drawer.Screen name="ParentProgress" component={ParentProgressScreen} />
      <Drawer.Screen name="ParentAIReports" component={ParentAIProgressReportScreen} />
      <Drawer.Screen name="ParentSettings" component={ParentSettingsScreen} />
      <Drawer.Screen name="ParentMessages" component={ParentMessagesScreen} />
      <Drawer.Screen name="ParentAnnouncements" component={AnnouncementsScreen} />
      <Drawer.Screen name="ParentAttendance" component={ParentAttendanceScreen} />
      <Drawer.Screen name="ParentControls" component={ParentControlsScreen} />
      <Drawer.Screen name="ParentLearning" component={ParentLearningScreen} />
      <Drawer.Screen name="ParentHelp" component={ParentHelpScreen} />
      <Drawer.Screen name="ParentSubscription" component={SubscriptionScreen} />
      <Drawer.Screen name="MyClasses" component={MyClassesScreen} />
      <Drawer.Screen name="ClassDetail" component={ClassDetailScreen} />
      <Drawer.Screen name="Timetable" component={TimetableScreen} />
      <Drawer.Screen name="Resources" component={ResourcesScreen} />
      <Drawer.Screen name="Channels" component={ChannelsScreen} />
    </Drawer.Navigator>
  );
}
