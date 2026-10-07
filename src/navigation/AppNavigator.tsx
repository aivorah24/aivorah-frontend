import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerParamList } from './types';
import { useTheme } from '../context/ThemeContext';

import DrawerContent from '../components/common/DrawerContent';
import DashboardScreen from '../screens/student/dashboard/DashboardScreen';
import ProfileScreen from '../screens/student/profile/ProfileScreen';
import LearningPathsScreen from '../screens/student/learning-paths/LearningPathsScreen';
import AICoachScreen from '../screens/student/ai-coach/AICoachScreen';
import ScheduleScreen from '../screens/student/schedule/ScheduleScreen';
import TimetableScreen from '../screens/shared/timetable/TimetableScreen';
import ResourcesScreen from '../screens/shared/resources/ResourcesScreen';
import AssignmentsScreen from '../screens/student/assignments/AssignmentsScreen';
import ChallengesScreen from '../screens/student/challenges/ChallengesScreen';
import LeaderboardScreen from '../screens/student/leaderboard/LeaderboardScreen';
import ProgressScreen from '../screens/student/progress/ProgressScreen';
import HelpCenterScreen from '../screens/student/helpCenter/HelpCenterScreen';
import SettingsScreen from '../screens/student/settings/SettingsScreen';
import VideoLessonScreen from '@legacy/student-legacy/VideoLessonScreen';
import VideoPlayerScreen from '@legacy/student-legacy/VideoPlayerScreen';
import NCERTChaptersScreen from '@legacy/student-legacy/NCERTChaptersScreen';
import SubjectTopicsScreen from '@legacy/student-legacy/SubjectTopicsScreen';
import SubjectSyllabusScreen from '../screens/student/learning-paths/subject-syllabus/SubjectSyllabusScreen';
import TeacherPublishedLearningPathScreen from '../screens/student/learning-paths/teacher-learning-paths/TeacherPublishedLearningPathScreen';
import LessonScreen from '../screens/student/learning-paths/lesson-screen/LessonScreen';
import Learn5EScreen from '@legacy/student-legacy/Learn5EScreen';
import MathHelperScreen from '@legacy/student-legacy/MathHelperScreen';
import AIStorytellerScreen from '@legacy/student-legacy/AIStorytellerScreen';
import DrawingBuddyScreen from '@legacy/student-legacy/DrawingBuddyScreen';
import WordWizardScreen from '@legacy/student-legacy/WordWizardScreen';
import RewardsScreen from '@legacy/student-legacy/RewardsScreen';
import QuizScreen from '../screens/student/learning-paths/quiz/QuizScreen';
import WorldAndYouScreen from '../screens/student/world-and-you/WorldAndYouScreen';
import TopicLessonScreen from '@legacy/student-legacy/TopicLessonScreen';
import MathLessonScreen from '@legacy/student-legacy/MathLessonScreen';
import BhagavathaStoriesScreen from '../screens/student/bedtime-stories/BhagavathaStoriesScreen';
import StoryReaderScreen from '../screens/student/bedtime-stories/StoryReaderScreen';
import ReadAloudScreen from '../screens/student/read-aloud/ReadAloudScreen';
import DailyHabitsScreen from '../screens/student/daily-habits/DailyHabitsScreen';
import SubscriptionScreen from '@legacy/student-legacy/SubscriptionScreen';
import MessagesScreen from '../screens/shared/messages/MessagesScreen';
import AnnouncementsScreen from '../screens/shared/announcements/AnnouncementsScreen';
import MyClassesScreen from '../features/classes/components/MyClassesScreen';
import ClassDetailScreen from '../features/classes/components/ClassDetailScreen';
import StudentAttendanceScreen from '../screens/student/attendance/StudentAttendanceScreen';

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function AppNavigator() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1 }}>
    <Drawer.Navigator
      initialRouteName="Dashboard"
      backBehavior="history"
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        // On tablet/desktop: permanent sidebar via ScreenLayout, hide drawer
        drawerType: isLargeScreen ? 'permanent' : 'slide',
        drawerStyle: isLargeScreen
          ? { width: 0, opacity: 0, pointerEvents: 'none' as const } // Hidden — ScreenLayout renders sidebar
          : { width: 260, backgroundColor: colors.sidebarDark },
        overlayColor: 'rgba(0,0,0,0.5)',
        swipeEnabled: !isLargeScreen,
        sceneContainerStyle: { backgroundColor: colors.bgDark },
        animationEnabled: false,
      } as any}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="LearningPaths" component={LearningPathsScreen} />
      <Drawer.Screen name="AICoach" component={AICoachScreen} />
      <Drawer.Screen name="Schedule" component={ScheduleScreen} />
      <Drawer.Screen name="Timetable" component={TimetableScreen} />
      <Drawer.Screen name="Resources" component={ResourcesScreen} />
      <Drawer.Screen name="Assignments" component={AssignmentsScreen} />
      <Drawer.Screen name="Challenges" component={ChallengesScreen} />
      <Drawer.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Drawer.Screen name="Progress" component={ProgressScreen} />
      <Drawer.Screen name="Rewards" component={RewardsScreen} />
      <Drawer.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="VideoLesson" component={VideoLessonScreen} />
      <Drawer.Screen name="VideoPlayer" component={VideoPlayerScreen} />
      <Drawer.Screen name="NCERTChapters" component={NCERTChaptersScreen} />
      <Drawer.Screen name="SubjectTopics" component={SubjectTopicsScreen} />
      <Drawer.Screen name="SubjectSyllabus" component={SubjectSyllabusScreen} />
      <Drawer.Screen name="TeacherPublishedLearningPath" component={TeacherPublishedLearningPathScreen} />
      <Drawer.Screen name="LessonScreen" component={LessonScreen} />
      <Drawer.Screen name="Learn5E" component={Learn5EScreen} />
      <Drawer.Screen name="MathHelper" component={MathHelperScreen} />
      <Drawer.Screen name="AIStoryteller" component={AIStorytellerScreen} />
      <Drawer.Screen name="DrawingBuddy" component={DrawingBuddyScreen} />
      <Drawer.Screen name="WordWizard" component={WordWizardScreen} />
      <Drawer.Screen name="Quiz" component={QuizScreen} />
      <Drawer.Screen name="WorldAndYou" component={WorldAndYouScreen} />
      <Drawer.Screen name="TopicLesson" component={TopicLessonScreen} />
      <Drawer.Screen name="MathLesson" component={MathLessonScreen} />
      <Drawer.Screen name="BhagavathaStories" component={BhagavathaStoriesScreen} />
      <Drawer.Screen name="StoryReader" component={StoryReaderScreen} />
      <Drawer.Screen name="ReadAloud" component={ReadAloudScreen} />
      <Drawer.Screen name="DailyHabits" component={DailyHabitsScreen} />
      <Drawer.Screen name="Subscription" component={SubscriptionScreen} />
      <Drawer.Screen name="Messages" component={MessagesScreen} />
      <Drawer.Screen name="Announcements" component={AnnouncementsScreen} />
      <Drawer.Screen name="StudentAttendance" component={StudentAttendanceScreen} />
      <Drawer.Screen name="MyClasses" component={MyClassesScreen} />
      <Drawer.Screen name="ClassDetail" component={ClassDetailScreen} />
    </Drawer.Navigator>
    </View>
  );
}
