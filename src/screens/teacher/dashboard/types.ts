export type InsightTile = {
  icon: any;
  color: string;
  stat: string;
  label: string;
  title: string;
  body: string;
  screen: string;
  params?: Record<string, any>;
};

export type ActivityEvent = {
  studentId: string;
  name?: string;
  text?: string;
  prefix?: string;
  title?: string;
  suffix?: string;
  type?: 'topic' | 'assignment' | 'challenge';
  timestamp: string;
};

export type RecentActivityItem = {
  id: string;
  initials: string;
  name: string;
  action?: string;
  prefix?: string;
  title?: string;
  suffix?: string;
  icon: any;
  time: string;
  studentId: string;
};
