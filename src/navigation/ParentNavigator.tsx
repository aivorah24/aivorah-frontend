import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { ParentDrawerParamList } from './types';
import { useTheme } from '../context/ThemeContext';

import DrawerContent from '../components/common/DrawerContent';
import ParentDashboardScreen from '../screens/parent/dashboard/ParentDashboardScreen';
import { createLazyScreenGroup, useRoleWarmup } from './lazyScreens';
import { PARENT_SERVICES } from '../config/roleServices';

// Every screen below loads from its own chunk on first open (lazyScreens.tsx);
// ParentDashboardScreen stays in the main bundle so the home page needs no extra download.
const screens = createLazyScreenGroup();
const DashboardScreen = screens.lazyScreen(() => import('../screens/student/dashboard/DashboardScreen'));
const ParentProfileScreen = screens.lazyScreen(() => import('../screens/parent/profile/ParentProfileScreen'));
const ParentMyKidsScreen = screens.lazyScreen(() => import('../screens/parent/my-kids/ParentMyKidsScreen'));
const ParentDailyTasksScreen = screens.lazyScreen(() => import('../screens/parent/daily-tasks/ParentDailyTasksScreen'));
const ParentScheduleScreen = screens.lazyScreen(() => import('@legacy/parent/ParentScheduleScreen'));
const ParentAssignmentsScreen = screens.lazyScreen(() => import('../screens/parent/assignments/ParentAssignmentsScreen'));
const ParentChallengesScreen = screens.lazyScreen(() => import('../screens/parent/challenges/ParentChallengesScreen'));
const ParentLeaderboardScreen = screens.lazyScreen(() => import('@legacy/parent/ParentLeaderboardScreen'));
const ParentProgressScreen = screens.lazyScreen(() => import('../screens/parent/progress/ParentProgressScreen'));
const ParentAIProgressReportScreen = screens.lazyScreen(() => import('../screens/parent/ai-progress-report/ParentAIProgressReportScreen'));
const ParentSettingsScreen = screens.lazyScreen(() => import('../screens/parent/settings/ParentSettingsScreen'));
const ParentMessagesScreen = screens.lazyScreen(() => import('@legacy/parent/ParentMessagesScreen'));
const AnnouncementsScreen = screens.lazyScreen(() => import('../screens/shared/announcements/AnnouncementsScreen'));
const SubscriptionScreen = screens.lazyScreen(() => import('@legacy/student-legacy/SubscriptionScreen'));
const MyClassesScreen = screens.lazyScreen(() => import('../features/classes/components/MyClassesScreen'));
const ClassDetailScreen = screens.lazyScreen(() => import('../features/classes/components/ClassDetailScreen'));
const TimetableScreen = screens.lazyScreen(() => import('../screens/shared/timetable/TimetableScreen'));
const ResourcesScreen = screens.lazyScreen(() => import('../screens/shared/resources/ResourcesScreen'));
const ChannelsScreen = screens.lazyScreen(() => import('../features/channels/components/ChannelsScreen'));
const ParentAttendanceScreen = screens.lazyScreen(() => import('../screens/parent/attendance/ParentAttendanceScreen'));
const ParentControlsScreen = screens.lazyScreen(() => import('../screens/parent/parental-controls/ParentControlsScreen'));
const ParentLearningScreen = screens.lazyScreen(() => import('../screens/parent/learning/ParentLearningScreen'));
const ParentHelpScreen = screens.lazyScreen(() => import('../screens/parent/help-center/ParentHelpScreen'));

const Drawer = createDrawerNavigator<ParentDrawerParamList>();

export default function ParentNavigator() {
  // Wake this role's services and, on a good connection, prefetch its screens.
  useRoleWarmup(screens, PARENT_SERVICES);
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
