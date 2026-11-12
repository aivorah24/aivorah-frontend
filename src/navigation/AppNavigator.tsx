import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerParamList } from './types';
import { useTheme } from '../context/ThemeContext';

import DrawerContent from '../components/common/DrawerContent';
import DashboardScreen from '../screens/student/dashboard/DashboardScreen';
import { createLazyScreenGroup, useRoleWarmup } from './lazyScreens';
import { STUDENT_SERVICES } from '../config/roleServices';

// Every screen below loads from its own chunk on first open (lazyScreens.tsx);
// DashboardScreen stays in the main bundle so the home page needs no extra download.
const screens = createLazyScreenGroup();
const LessonScreen = screens.lazyScreen(() => import('../screens/student/learning-paths/lesson-screen/LessonScreen'));
const ProfileScreen = screens.lazyScreen(() => import('../screens/student/profile/ProfileScreen'));
const LearningPathsScreen = screens.lazyScreen(() => import('../screens/student/learning-paths/LearningPathsScreen'));
const AICoachScreen = screens.lazyScreen(() => import('../screens/student/ai-coach/AICoachScreen'));
const ScheduleScreen = screens.lazyScreen(() => import('../screens/student/schedule/ScheduleScreen'));
const TimetableScreen = screens.lazyScreen(() => import('../screens/shared/timetable/TimetableScreen'));
const ResourcesScreen = screens.lazyScreen(() => import('../screens/shared/resources/ResourcesScreen'));
const AssignmentsScreen = screens.lazyScreen(() => import('../screens/student/assignments/AssignmentsScreen'));
const ChallengesScreen = screens.lazyScreen(() => import('../screens/student/challenges/ChallengesScreen'));
const LeaderboardScreen = screens.lazyScreen(() => import('../screens/student/leaderboard/LeaderboardScreen'));
const ProgressScreen = screens.lazyScreen(() => import('../screens/student/progress/ProgressScreen'));
const HelpCenterScreen = screens.lazyScreen(() => import('../screens/student/helpCenter/HelpCenterScreen'));
const SettingsScreen = screens.lazyScreen(() => import('../screens/student/settings/SettingsScreen'));
const VideoLessonScreen = screens.lazyScreen(() => import('@legacy/student-legacy/VideoLessonScreen'));
const VideoPlayerScreen = screens.lazyScreen(() => import('@legacy/student-legacy/VideoPlayerScreen'));
const NCERTChaptersScreen = screens.lazyScreen(() => import('@legacy/student-legacy/NCERTChaptersScreen'));
const SubjectTopicsScreen = screens.lazyScreen(() => import('@legacy/student-legacy/SubjectTopicsScreen'));
const SubjectSyllabusScreen = screens.lazyScreen(() => import('../screens/student/learning-paths/subject-syllabus/SubjectSyllabusScreen'));
const TeacherPublishedLearningPathScreen = screens.lazyScreen(() => import('../screens/student/learning-paths/teacher-learning-paths/TeacherPublishedLearningPathScreen'));
const Learn5EScreen = screens.lazyScreen(() => import('@legacy/student-legacy/Learn5EScreen'));
const MathHelperScreen = screens.lazyScreen(() => import('@legacy/student-legacy/MathHelperScreen'));
const AIStorytellerScreen = screens.lazyScreen(() => import('@legacy/student-legacy/AIStorytellerScreen'));
const DrawingBuddyScreen = screens.lazyScreen(() => import('@legacy/student-legacy/DrawingBuddyScreen'));
const WordWizardScreen = screens.lazyScreen(() => import('@legacy/student-legacy/WordWizardScreen'));
const RewardsScreen = screens.lazyScreen(() => import('@legacy/student-legacy/RewardsScreen'));
const QuizScreen = screens.lazyScreen(() => import('../screens/student/learning-paths/quiz/QuizScreen'));
const WorldAndYouScreen = screens.lazyScreen(() => import('../screens/student/world-and-you/WorldAndYouScreen'));
const TopicLessonScreen = screens.lazyScreen(() => import('@legacy/student-legacy/TopicLessonScreen'));
const MathLessonScreen = screens.lazyScreen(() => import('@legacy/student-legacy/MathLessonScreen'));
const BhagavathaStoriesScreen = screens.lazyScreen(() => import('../screens/student/bedtime-stories/BhagavathaStoriesScreen'));
const StoryReaderScreen = screens.lazyScreen(() => import('../screens/student/bedtime-stories/StoryReaderScreen'));
const ReadAloudScreen = screens.lazyScreen(() => import('../screens/student/read-aloud/ReadAloudScreen'));
const DailyHabitsScreen = screens.lazyScreen(() => import('../screens/student/daily-habits/DailyHabitsScreen'));
const SubscriptionScreen = screens.lazyScreen(() => import('@legacy/student-legacy/SubscriptionScreen'));
const MessagesScreen = screens.lazyScreen(() => import('../screens/shared/messages/MessagesScreen'));
const AnnouncementsScreen = screens.lazyScreen(() => import('../screens/shared/announcements/AnnouncementsScreen'));
const CurrentAffairsScreen = screens.lazyScreen(() => import('../screens/shared/current-affairs/DigestScreen'));
const CurrentAffairsStoryScreen = screens.lazyScreen(() => import('../screens/shared/current-affairs/StoryScreen'));
const CurrentAffairsQuizScreen = screens.lazyScreen(() => import('../screens/shared/current-affairs/QuizScreen'));
const MyClassesScreen = screens.lazyScreen(() => import('../features/classes/components/MyClassesScreen'));
const ClassDetailScreen = screens.lazyScreen(() => import('../features/classes/components/ClassDetailScreen'));
const StudentAttendanceScreen = screens.lazyScreen(() => import('../screens/student/attendance/StudentAttendanceScreen'));

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function AppNavigator() {
  // Wake this role's services and, on a good connection, prefetch its screens.
  useRoleWarmup(screens, STUDENT_SERVICES);
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
      <Drawer.Screen name="CurrentAffairs" component={CurrentAffairsScreen} />
      <Drawer.Screen name="CurrentAffairsStory" component={CurrentAffairsStoryScreen} />
      <Drawer.Screen name="CurrentAffairsQuiz" component={CurrentAffairsQuizScreen} />
      <Drawer.Screen name="StudentAttendance" component={StudentAttendanceScreen} />
      <Drawer.Screen name="MyClasses" component={MyClassesScreen} />
      <Drawer.Screen name="ClassDetail" component={ClassDetailScreen} />
    </Drawer.Navigator>
    </View>
  );
}
