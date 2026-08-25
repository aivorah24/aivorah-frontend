export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  note: string;
  studentId: string;
  createdBy: string;
  tag: string | null;
  isAllDay?: boolean;
  // Present on events returned/decorated with UI accent info at selection time
  studentName?: string;
  creatorEmail?: string;
  createdAt?: string;
  accent?: string;
  fill?: string;
  textCol?: string;
}

export interface StudentItem {
  id: string;
  name: string;
  grade: string;
}

export interface WeekDay {
  iso: string;
  day: string;
  date: number;
}

export interface DragPreview {
  dayIso: string;
  top: number;
  height: number;
  startT: string;
  endT: string;
}

export type TargetStudents = 'all' | 'specific';
