export type ModalType = 'name' | 'email' | 'password' | 'location' | 'ssoInfo' | null;

export interface NotificationPrefs {
  assignmentAlerts: boolean;
  teacherMessages: boolean;
  weeklyReport: boolean;
  progressNudges: boolean;
  challengeUpdates: boolean;
}
