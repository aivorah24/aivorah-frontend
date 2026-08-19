import type { AppColors } from '../../../theme';
import type { HelpTopic } from './types';

export const FAQS = [
  { q: 'How do I start a new learning path?', a: 'Go to "My Learning Paths" in the sidebar, then select a subject. Tap "Start" on any available level to begin.' },
  { q: 'How are XP points and levels calculated?', a: 'XP is earned by completing lessons (+50 XP), assignments (+75 XP), and challenges (+100 XP). Your level increases as you accumulate XP.' },
  { q: 'Can I change my study schedule?', a: 'Yes! Go to Schedule and tap the "+" button to add a new study session. You can set the title, time, duration, and color.' },
  { q: 'How does the AI Coach work?', a: 'The AI Coach uses your progress data to suggest topics, answer questions, and provide personalised learning help. Just type your question in the chat.' },
  { q: 'What happens if I miss an assignment deadline?', a: 'Overdue assignments move to the "Overdue" tab. You can still complete them — XP earned for late submissions is reduced by 50%.' },
  { q: 'How do I maintain my daily streak?', a: 'Log in and complete at least one lesson or challenge every day. Your streak counter resets to 0 if you miss a day.' },
  { q: 'Can I use Aivorah on multiple devices?', a: 'Yes! Sign in with the same account on any device — web browser, tablet, or phone. Your progress syncs automatically.' },
  { q: 'How do I change my avatar or profile photo?', a: 'Go to Profile in the sidebar. In the "Choose Avatar Style" section, pick any style and tap "Save Avatar".' },
  { q: 'Is my data private and secure?', a: 'Yes. All data is encrypted and stored securely. We never sell your personal data. You can delete your account at any time from Settings.' },
  { q: 'How do I contact a human support agent?', a: 'Use the "Submit Ticket" button to send us a message. Our support team typically responds within 24 hours on business days.' },
];

export const ARTICLE_CONTENT: Record<string, string> = {
  'How to set up your profile': 'Go to Profile from the sidebar. Tap Edit to update your name, grade, avatar and learning preferences.',
  'Choosing your role (Student / Teacher / Parent)': 'Your role is set during signup. Students access learning paths and AI Coach. Teachers can assign work and track progress.',
  'Navigating the dashboard': 'The Dashboard shows your daily goals, recent activity, badges, and quick links to your active learning paths.',
  'Setting your learning goal': 'Go to Profile > Settings and set your daily study time goal. Aivorah will suggest a schedule.',
  'Starting a new learning path': 'Go to My Learning Paths and tap "Explore Topics". Choose a subject and grade level.',
  'Understanding levels (locked, active, complete)': 'Each topic has Basic, Intermediate and Advanced levels. Complete Basic to unlock Intermediate.',
  'Switching between subjects': 'From My Learning Paths, use the subject filter tabs at the top to switch between subjects.',
  'Weekly focus and milestones': 'Each week Aivorah sets a focus topic based on your progress. Complete the week\'s milestone to earn bonus XP.',
  'How to submit an assignment': 'Open Assignments, tap the assignment card, complete each question, then tap Submit.',
  'Understanding due dates': 'Due dates appear on each assignment card and in your Schedule. Assignments due today are highlighted.',
  'Overdue assignment policy': 'Overdue assignments stay visible and can still be submitted. XP for late submissions is reduced by 50%.',
  'Viewing feedback from your teacher': 'After submission, open the assignment and scroll to the Feedback section.',
  'How XP points are calculated': 'You earn XP for every activity: +10 per correct answer, +25 per lesson, +50 per level, +100 per challenge.',
  'Understanding daily challenges': 'Daily challenges appear on your Dashboard each morning — 5-question quizzes on recent topics.',
  'Maintaining your streak': 'Your streak increases by 1 each day you complete at least one activity. Miss a day and it resets to zero.',
  'Unlocking badges and achievements': 'Badges are awarded automatically when you hit milestones — first lesson, 7-day streak, leaderboard, and more.',
  'What the AI Coach can do': 'The AI Coach explains concepts, answers questions, generates practice problems, and adapts to your level.',
  'Asking for help on a topic': 'Open AI Coach and type your question naturally — for example "I don\'t understand fractions".',
  'Getting personalized suggestions': 'The AI Coach tracks which topics you find difficult and proactively suggests practice.',
  'AI Coach limitations': 'The AI Coach is designed for school subjects. For platform issues, use the 24/7 Support or Submit a Ticket.',
  'Adding study sessions': 'Go to Schedule and tap the + button. Choose a subject, set the time and duration.',
  'Setting event reminders': 'When adding a study session, toggle on Reminder and choose how many minutes before you\'d like to be notified.',
  'Viewing upcoming deadlines': 'The Schedule screen shows all assignment due dates and study sessions in a calendar view.',
  'Syncing with your calendar': 'On web, go to Settings > Integrations to connect Google Calendar.',
  'Understanding your overall score': 'Your overall score is a weighted average of XP earned, assignments completed, and challenge performance.',
  'Reading the weekly activity chart': 'The bar chart on your Progress screen shows daily activity minutes for the past 7 days.',
  'Subject performance breakdown': 'Scroll down on the Progress screen to see a card for each subject showing completion percentage.',
  'What achievements mean': 'Achievements are permanent records of your best moments on Aivorah.',
  'Changing your email or password': 'Go to Settings > Account. Tap Change Email or Change Password.',
  'Managing notification preferences': 'Go to Settings > Notifications. Toggle on or off various notification types.',
  'Switching app theme': 'Use the Theme selector at the bottom of the sidebar — choose Dark, Light, or Auto.',
  'Deleting your account': 'Go to Settings > Account > Delete Account. This is permanent and removes all your data.',
};

export const CHAT_SUGGESTIONS = ['About XP', 'About badges', 'Learning paths', 'How XP works?', 'Daily streaks'];

export function buildTopics(colors: AppColors): HelpTopic[] {
  return [
    { label: 'Account & Profile', icon: 'user',          color: colors.accentYellow, desc: 'Profile, security, preferences',  screen: 'Settings',       articles: ['How to set up your profile', 'Choosing your role (Student / Teacher / Parent)', 'Navigating the dashboard', 'Setting your learning goal'] },
    { label: 'XP & Streaks',      icon: 'award',         color: colors.accentYellow, desc: 'Points, levels, daily streaks',   screen: 'Challenges',     articles: ['How XP points are calculated', 'Understanding daily challenges', 'Maintaining your streak', 'Unlocking badges and achievements'] },
    { label: 'Badges',            icon: 'shield',        color: colors.accentYellow, desc: 'Achievements and milestones',     screen: 'Challenges',     articles: ['Unlocking badges and achievements', 'What achievements mean', 'How XP points are calculated', 'Understanding daily challenges'] },
    { label: 'Learning Paths',    icon: 'map',           color: colors.accentYellow, desc: 'Courses, levels, subjects',       screen: 'LearningPaths',  articles: ['Starting a new learning path', 'Understanding levels (locked, active, complete)', 'Switching between subjects', 'Weekly focus and milestones'] },
    // No billing/subscription articles exist in ARTICLE_CONTENT (this file
    // previously reused the AI Coach topic's 4 articles here by mistake -
    // wrong content, not just a display bug). Left empty rather than
    // inventing copy; the topic modal renders correctly with zero articles.
    { label: 'Billing & Plans',   icon: 'credit-card',   color: colors.accentYellow, desc: 'Subscriptions, upgrades',         screen: 'Subscription',   articles: [] },
    { label: 'Technical Support', icon: 'tool',          color: colors.accentYellow, desc: 'Bugs, troubleshooting',           screen: 'Profile',        articles: ['Can I use Aivorah on multiple devices?', 'Changing your email or password', 'Managing notification preferences', 'Deleting your account'] },
    { label: 'Assignments',       icon: 'check-circle',  color: colors.accentYellow, desc: 'Submitting work, grading',        screen: 'Assignments',    articles: ['How to submit an assignment', 'Understanding due dates', 'Overdue assignment policy', 'Viewing feedback from your teacher'] },
    { label: 'AI Coach',          icon: 'message-circle', color: colors.accentYellow, desc: 'How to use AI features',         screen: 'AICoach',        articles: ['What the AI Coach can do', 'Asking for help on a topic', 'Getting personalized suggestions', 'AI Coach limitations'] },
  ];
}
